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
from .utils import execute_with_safe_transaction, generate_id, strip_editor_html
from .conversation_service import create_conversation

from ...queue import QueuedRequest, RequestPriority, QueueManagerInterface
from ...auth.models import User
from ...config import settings
from ...db import SessionLocal  # Import SessionLocal for creating fresh sessions

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
    # Create a fresh database session specifically for this request
    # to avoid transaction conflicts between sync and async code
    fresh_db = SessionLocal()
    try:
        # Create or get conversation
        if conversation_id:
            conversation = fresh_db.query(Conversation).filter(
                Conversation.id == conversation_id,
                Conversation.user_id == user.id
            ).first()
            
            if not conversation:
                return {
                    "success": False,
                    "error": "Conversation not found",
                    "message_id": None,
                    "conversation_id": None
                }
        else:
            # Create new conversation using the conversation service (which adds welcome message)
            result = create_conversation(fresh_db, user.id, message_text[:50] if message_text else "New Conversation")
            if not result.get("success", False):
                return {
                    "success": False,
                    "error": result.get("error", "Failed to create conversation"),
                    "message_id": None,
                    "conversation_id": None
                }
            
            # Get the conversation ID from the result
            conv_id = result["conversation_id"]
            conversation = fresh_db.query(Conversation).filter(Conversation.id == conv_id).first()
        
        # Handle file content if provided
        if file_content:
            message_text = f"{message_text}\n\n[Uploaded file: {file_content['filename']}, size: {file_content['size']} bytes]"
        
        # Create message with explicit ID
        message_id = generate_id()
        message = Message(
            id=message_id,
            conversation_id=conversation.id,
            role="user",
            content=message_text  # Store original message including HTML
        )
        fresh_db.add(message)
        
        # Update conversation timestamp
        conversation.updated_at = datetime.now()
        
        # Commit database changes
        fresh_db.commit()
        
        # Store necessary info before closing the session
        conv_id = conversation.id
        user_id = user.id
        
        # Queue LLM request using correct parameter order
        request_obj = QueuedRequest(
            priority=RequestPriority.WEB_INTERFACE,  # Use correct enum value
            endpoint="/api/llm/generate",  # Endpoint for LLM generation
            body={
                "messages": [{"role": "user", "content": strip_editor_html(message_text)}],  # Strip editor HTML but keep pasted HTML
                "model": settings.default_model,  # Use the model configured in settings
                "stream": False,
                "conversation_id": conv_id,
                "message_id": message_id,
                "system": "You are a helpful AI assistant that answers questions accurately and concisely.",
                "temperature": settings.temperature,
                # Include tools if enabled in settings
                **({"tools": []} if settings.tool_calling_enabled else {})
            },
            user_id=user_id
        )
        
        # Track this request for WebSocket updates
        manager.track_request(request_obj.timestamp.timestamp(), user_id)
        
        # Queue the request
        await queue_manager.add_request(request_obj)
        
        # Start async processing (don't pass the DB session)
        asyncio.create_task(
            process_message(
                user_id,
                message_id, 
                conv_id, 
                request_obj, 
                queue_manager
            )
        )
        
        return {
            "success": True,
            "message_id": message_id,
            "conversation_id": conv_id
        }
            
    except Exception as e:
        # Rollback on any error
        try:
            fresh_db.rollback()
        except:
            pass
            
        logger.error(f"Error in message handling: {str(e)}")
        return {
            "success": False,
            "error": f"Error processing message: {str(e)}",
            "message_id": None,
            "conversation_id": None
        }
    finally:
        # Always close the session
        fresh_db.close()

async def process_message(
    user_id: int,
    message_id: str,
    conversation_id: str,
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
                    await manager.send_update(user_id, {
                        "type": "message_update",
                        "message_id": message_id,
                        "conversation_id": conversation_id,
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
                    await manager.send_update(user_id, {
                        "type": "message_update",
                        "message_id": message_id,
                        "conversation_id": conversation_id,
                        "status": "PROCESSING"
                    })
                    
                    # Get request from queue and process it
                    llm_response = await queue_manager.process_request(request_obj)
                    
                    # Handle the response if successful
                    if llm_response:
                        # Get response content with improved format detection
                        if isinstance(llm_response, str):
                            assistant_content = llm_response
                        elif isinstance(llm_response, Dict):
                            # Try different response formats - processor.py uses OpenAI format
                            if "choices" in llm_response and len(llm_response["choices"]) > 0:
                                # OpenAI-style response format from processor.py
                                choice = llm_response["choices"][0]
                                if "message" in choice and "content" in choice["message"]:
                                    assistant_content = choice["message"]["content"]
                                else:
                                    assistant_content = str(choice)
                            # Fallback to older formats
                            elif "response" in llm_response:
                                assistant_content = llm_response.get("response", "")
                            else:
                                # Try to find content in any format
                                content_keys = ["content", "text", "message", "answer", "result"]
                                for key in content_keys:
                                    if key in llm_response:
                                        assistant_content = llm_response[key]
                                        break
                                else:
                                    # If we can't find a known key, just stringify the whole response
                                    assistant_content = str(llm_response)
                                    
                            # Log what we found
                            logger.info(f"Extracted response content: {assistant_content[:50]}...")
                        else:
                            logger.error(f"Unexpected response type: {type(llm_response)}")
                            assistant_content = "Error: Unable to process response"
                        
                        # Send initial streaming status to client
                        await manager.send_update(user_id, {
                            "type": "message_update",
                            "message_id": message_id,
                            "conversation_id": conversation_id,
                            "status": "STREAMING",
                            "assistant_content": ""  # Start with empty content
                        })
                        
                        # Now let's use the actual content we already have
                        # We'll send one message with the full content since we already have it
                        await manager.send_update(user_id, {
                            "type": "message_update",
                            "message_id": message_id,
                            "conversation_id": conversation_id,
                            "status": "STREAMING",
                            "assistant_content": assistant_content,
                            "is_complete": True  # Mark as complete since we have the full content
                        })
                        
                        logger.info(f"Sent complete content with {len(assistant_content)} characters")
                        
                        # Create a new database session for the async operation
                        db = SessionLocal()
                        try:
                            # Create assistant message
                            assistant_message_id = generate_id()
                            assistant_message = Message(
                                id=assistant_message_id,
                                conversation_id=conversation_id,
                                role="assistant",
                                content=assistant_content
                            )
                            db.add(assistant_message)
                            
                            # Load the conversation to update title
                            conversation = db.query(Conversation).filter(
                                Conversation.id == conversation_id
                            ).first()
                            
                            if not conversation:
                                raise ValueError(f"Conversation not found: {conversation_id}")
                            
                            # Update conversation title if this is first exchange
                            message_count = db.query(Message).filter(
                                Message.conversation_id == conversation_id
                            ).count()
                            
                            if message_count <= 2 and (not conversation.title or conversation.title.startswith("New Conversation")):
                                # Generate title from first exchange (max 50 chars)
                                first_msg = db.query(Message).filter(
                                    Message.conversation_id == conversation_id,
                                    Message.role == "user"
                                ).order_by(Message.created_at).first()
                                
                                if first_msg:
                                    # Create title from first 50 chars
                                    new_title = first_msg.content[:50]
                                    if len(first_msg.content) > 50:
                                        new_title += "..."
                                    conversation.title = new_title
                            
                            # Commit changes
                            db.commit()
                            
                            # Send WebSocket update
                            await manager.send_update(user_id, {
                                "type": "message_update",
                                "message_id": message_id,
                                "conversation_id": conversation_id,
                                "status": "COMPLETE",
                                "assistant_message_id": assistant_message_id,
                                "assistant_content": assistant_content,
                                "is_complete": True
                            })
                            
                            # Clean up tracking
                            manager.untrack_request(request_obj.timestamp.timestamp())
                            
                            logger.info(f"Completed processing for conversation {conversation_id}")
                            return
                            
                        except Exception as db_error:
                            # Handle DB error
                            try:
                                db.rollback()
                            except:
                                pass
                                
                            logger.error(f"Database error saving assistant message: {str(db_error)}")
                            
                            # Send error through WebSocket
                            await manager.send_update(user_id, {
                                "type": "message_update",
                                "message_id": message_id,
                                "conversation_id": conversation_id,
                                "status": "ERROR",
                                "error": "Error saving assistant message"
                            })
                            
                            # Clean up tracking
                            manager.untrack_request(request_obj.timestamp.timestamp())
                            return
                        finally:
                            # Always close the database session
                            db.close()
                    
                    break
            
            # Wait before checking again
            await asyncio.sleep(1)
        
        # Handle timeout if we reached here
        if asyncio.get_event_loop().time() - start_time >= timeout_seconds:
            # Send timeout error through WebSocket
            await manager.send_update(user_id, {
                "type": "message_update",
                "message_id": message_id,
                "conversation_id": conversation_id,
                "status": "ERROR",
                "error": "Request timed out waiting for LLM response"
            })
            
            # Clean up tracking
            manager.untrack_request(request_obj.timestamp.timestamp())
            
            logger.warning(f"Request timed out for conversation {conversation_id}")
            
    except Exception as e:
        # Handle any unexpected errors
        logger.error(f"Error processing message: {str(e)}")
        
        # Send error through WebSocket
        await manager.send_update(user_id, {
            "type": "message_update",
            "message_id": message_id,
            "conversation_id": conversation_id,
            "status": "ERROR",
            "error": "Unexpected error occurred"
        })
        
        # Clean up tracking
        manager.untrack_request(request_obj.timestamp.timestamp())
        
        # Try to clean up the queue
        try:
            await queue_manager.remove_request(request_obj)
        except Exception as cleanup_error:
            logger.error(f"Error cleaning up queue: {str(cleanup_error)}")