"""
Message handling service layer for chat functionality.
"""
import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session

from .models import Conversation, Message
from .websocket import manager
from .utils import execute_with_safe_transaction, generate_id

from ...queue import QueuedRequest, RequestPriority, QueueManagerInterface
from ...auth.models import User
from ...config import settings

# Set up logger
logger = logging.getLogger("app.api.chat.message_service")

async def get_message_status(
    db: Session,
    message_id: str,
    user_id: int,
    queue_manager: QueueManagerInterface
) -> Optional[Dict[str, Any]]:
    """Get the status of a message in the queue"""
    # Find the message in the database
    message = db.query(Message).filter(Message.id == message_id).first()
    
    if not message:
        return None
    
    # Verify the user has access to this message
    conversation = db.query(Conversation).filter(
        Conversation.id == message.conversation_id,
        Conversation.user_id == user_id
    ).first()
    
    if not conversation:
        return None
    
    # If message is from assistant, it's already complete
    if message.role == "assistant":
        return {
            "status": "COMPLETE",
            "queue_position": None
        }
    
    # Check queue for user requests
    user_requests = await queue_manager.get_requests_for_user(user_id)
    
    # If we have requests in queue, try to find one for this conversation
    if user_requests:
        for request in user_requests:
            # Check if this request is related to our conversation
            if request.body and request.body.get("conversation_id") == conversation.id:
                # Get queue position
                position = await queue_manager.get_position(request)
                
                # Determine status based on position
                if position == 0:
                    return {
                        "status": "PROCESSING",
                        "queue_position": 0
                    }
                elif position > 0:
                    return {
                        "status": "QUEUED",
                        "queue_position": position
                    }
    
    # If we reach here, message is not in queue or already processed
    return {
        "status": "COMPLETE",
        "queue_position": None
    }

async def send_message(
    db: Session,
    user: User,
    message_text: str,
    conversation_id: Optional[str] = None,
    file_content: Optional[Dict[str, Any]] = None,
    queue_manager: QueueManagerInterface = None
) -> Dict[str, Any]:
    """Send a message to the LLM and store the conversation with improved transaction handling"""
    # Begin safe transaction
    try:
        # Set appropriate transaction isolation level
        execute_with_safe_transaction(db, "SET TRANSACTION ISOLATION LEVEL READ COMMITTED")
        transaction = db.begin_nested()
        
        try:
            # Create or get conversation
            if conversation_id:
                conversation = db.query(Conversation).filter(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user.id
                ).first()
                
                if not conversation:
                    transaction.rollback()
                    return {
                        "success": False,
                        "error": "Conversation not found",
                        "message_id": None,
                        "conversation_id": None
                    }
            else:
                # Create new conversation with explicit ID
                new_conversation_id = generate_id()
                conversation = Conversation(
                    id=new_conversation_id,
                    user_id=user.id,
                    title=message_text[:50] if message_text else "New Conversation"
                )
                db.add(conversation)
                db.flush()
            
            # Handle file content if provided
            if file_content:
                message_text = f"{message_text}\n\n[Uploaded file: {file_content['filename']}, size: {file_content['size']} bytes]"
            
            # Create message with explicit ID
            message_id = generate_id()
            message = Message(
                id=message_id,
                conversation_id=conversation.id,
                role="user",
                content=message_text
            )
            db.add(message)
            
            # Update conversation timestamp
            conversation.updated_at = datetime.now()
            
            # Commit transaction
            transaction.commit()
            db.commit()
            
            # Queue LLM request
            request_obj = QueuedRequest(
                timestamp=str(datetime.now().timestamp()),
                user_id=user.id,
                priority=RequestPriority.NORMAL,
                body={
                    "message": message_text,
                    "conversation_id": conversation.id,
                    "message_id": message_id
                }
            )
            
            # Track this request for WebSocket updates
            manager.track_request(request_obj.timestamp, user.id)
            
            # Queue the request
            await queue_manager.add_request(request_obj)
            
            # Start async processing
            asyncio.create_task(
                process_message(
                    db, 
                    user, 
                    message_id, 
                    conversation, 
                    request_obj, 
                    queue_manager
                )
            )
            
            return {
                "success": True,
                "message_id": message_id,
                "conversation_id": conversation.id
            }
            
        except Exception as inner_e:
            # Rollback transaction in case of error
            transaction.rollback()
            db.rollback()
            logger.error(f"Error processing message: {str(inner_e)}")
            
            return {
                "success": False,
                "error": str(inner_e),
                "message_id": None,
                "conversation_id": None
            }
            
    except Exception as e:
        # Handle outer transaction errors
        try:
            db.rollback()
        except:
            pass
            
        logger.error(f"Transaction error processing message: {str(e)}")
        return {
            "success": False,
            "error": f"Database error: {str(e)}",
            "message_id": None,
            "conversation_id": None
        }

async def process_message(
    db: Session,
    user: User,
    message_id: str,
    conversation: Conversation,
    request_obj: QueuedRequest,
    queue_manager: QueueManagerInterface
) -> None:
    """Process a message by waiting for LLM response and saving in database"""
    # Constants
    timeout_seconds = 300  # 5 minutes max wait
    last_position = -1
    start_time = asyncio.get_event_loop().time()
    
    try:
        # Wait for our turn in the queue
        while asyncio.get_event_loop().time() - start_time < timeout_seconds:
            # Get current queue position for logging
            position = await queue_manager.get_position(request_obj)
            if position is not None and position >= 0:
                # Send WebSocket update if position changed
                if position != last_position:
                    await manager.send_update(user.id, {
                        "type": "message_update",
                        "message_id": message_id,
                        "conversation_id": conversation.id,
                        "status": "QUEUED",
                        "queue_position": position
                    })
                    last_position = position
                
            # Check if we're first in queue
            current_request = await queue_manager.get_current_request()
            if not current_request:
                next_request = await queue_manager.get_next_request()
                if next_request and next_request.timestamp == request_obj.timestamp:
                    logger.info("Processing request now")
                    
                    # Send processing status update
                    await manager.send_update(user.id, {
                        "type": "message_update",
                        "message_id": message_id,
                        "conversation_id": conversation.id,
                        "status": "PROCESSING"
                    })
                    
                    # Get request from queue and process it
                    llm_response = await queue_manager.process_request(request_obj)
                    
                    # Handle the response if successful
                    if llm_response:
                        # Get response content
                        if isinstance(llm_response, str):
                            assistant_content = llm_response
                        elif isinstance(llm_response, Dict):
                            assistant_content = llm_response.get("response", "")
                        else:
                            logger.error(f"Unexpected response type: {type(llm_response)}")
                            assistant_content = "Error: Unable to process response"
                        
                        # Save assistant response in database
                        try:
                            # Begin new transaction
                            db.begin_nested()
                            
                            # Create assistant message
                            assistant_message = Message(
                                id=generate_id(),
                                conversation_id=conversation.id,
                                role="assistant",
                                content=assistant_content
                            )
                            db.add(assistant_message)
                            
                            # Update conversation title if this is first exchange
                            message_count = db.query(Message).filter(
                                Message.conversation_id == conversation.id
                            ).count()
                            
                            if message_count <= 2 and (not conversation.title or conversation.title.startswith("New Conversation")):
                                # Generate title from first exchange (max 50 chars)
                                first_msg = db.query(Message).filter(
                                    Message.conversation_id == conversation.id,
                                    Message.role == "user"
                                ).order_by(Message.created_at).first()
                                
                                if first_msg:
                                    new_title = first_msg.content[:50]
                                    if len(first_msg.content) > 50:
                                        new_title += "..."
                                    conversation.title = new_title
                            
                            # Commit changes
                            db.commit()
                            
                            # Send WebSocket update
                            await manager.send_update(user.id, {
                                "type": "message_update",
                                "message_id": message_id,
                                "conversation_id": conversation.id,
                                "status": "COMPLETE",
                                "response": {
                                    "id": assistant_message.id,
                                    "content": assistant_content
                                }
                            })
                            
                            # Clean up tracking
                            manager.untrack_request(request_obj.timestamp)
                            
                            logger.info(f"Completed processing for conversation {conversation.id}")
                            return
                            
                        except Exception as db_error:
                            # Handle DB error
                            db.rollback()
                            logger.error(f"Database error saving assistant message: {str(db_error)}")
                            
                            # Send error through WebSocket
                            await manager.send_update(user.id, {
                                "type": "message_update",
                                "message_id": message_id,
                                "conversation_id": conversation.id,
                                "status": "ERROR",
                                "error": "Error saving assistant message"
                            })
                            
                            # Clean up tracking
                            manager.untrack_request(request_obj.timestamp)
                            return
                    
                    break
            
            # Wait before checking again
            await asyncio.sleep(1)
        
        # Handle timeout if we reached here
        if asyncio.get_event_loop().time() - start_time >= timeout_seconds:
            # Send timeout error through WebSocket
            await manager.send_update(user.id, {
                "type": "message_update",
                "message_id": message_id,
                "conversation_id": conversation.id,
                "status": "ERROR",
                "error": "Request timed out waiting for LLM response"
            })
            
            # Clean up tracking
            manager.untrack_request(request_obj.timestamp)
            
            logger.warning(f"Request timed out for conversation {conversation.id}")
            
    except Exception as e:
        # Handle any unexpected errors
        logger.error(f"Error processing message: {str(e)}")
        
        # Send error through WebSocket
        await manager.send_update(user.id, {
            "type": "message_update",
            "message_id": message_id,
            "conversation_id": conversation.id,
            "status": "ERROR",
            "error": "Unexpected error occurred"
        })
        
        # Clean up tracking
        manager.untrack_request(request_obj.timestamp)
        
        # Try to clean up the queue
        try:
            await queue_manager.remove_request(request_obj)
        except Exception as cleanup_error:
            logger.error(f"Error cleaning up queue: {str(cleanup_error)}")