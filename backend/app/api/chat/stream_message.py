"""
Streaming message implementation for chat API.

This module contains the logic for streaming LLM responses
to clients through WebSockets or Server-Sent Events.
"""
from fastapi import status, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import logging
import asyncio
import json
import time
from datetime import datetime

from .websocket import manager, APPEND, REPLACE
from .models import Conversation, Message
from .utils import get_queue, generate_id, strip_editor_html
from ...config import settings
from ...db import SessionLocal
from ...queue import QueuedRequest, RequestPriority

# Set up logger
logger = logging.getLogger("app.api.chat.stream_message")

async def stream_message(
    db: Session,
    user: Any,
    message_text: str,
    conversation_id: Optional[str] = None,
    file_content: Optional[Dict[str, Any]] = None,
    queue_manager = None,
    assistant_message_id: Optional[str] = None,
    headers: Optional[Dict[str, str]] = None
) -> StreamingResponse:
    """Process a message with true token-by-token streaming from Ollama"""
    # Use a single database session for the entire request
    if not assistant_message_id:
        assistant_message_id = generate_id()
        logger.info(f"No assistant_message_id provided, generated: {assistant_message_id}")
    
    logger.info(f"Processing request with conversation_id: {conversation_id}, assistant_message_id: {assistant_message_id}")
    
    # STEP 1: Create or get conversation - Critical database operation
    try:
        # Check if this is a new conversation request (conversation_id == "new" or null)
        if conversation_id and conversation_id.lower() != "new":
            logger.info(f"Looking up conversation with ID {conversation_id} for user {user.id}")
            conversation = db.query(Conversation).filter(
                Conversation.id == conversation_id,
                Conversation.user_id == user.id
            ).first()
            
            if not conversation:
                logger.warning(f"Conversation not found: {conversation_id}")
                # Cannot use HTTP exceptions in streaming response
                async def error_stream():
                    yield json.dumps({"error": "Conversation not found"}).encode('utf-8')
                return StreamingResponse(error_stream(), media_type="text/event-stream")
        else:
            # Treat "new" or null conversation_id as a request to create a new conversation
            logger.info(f"Creating new conversation for user {user.id}")
            from .conversation_service import create_conversation
            result = create_conversation(db, user.id, message_text[:50] if message_text else "New Conversation")
            
            if not result.get("success", False):
                logger.error(f"Error creating conversation: {result.get('error')}")
                async def error_stream():
                    yield f"data: {json.dumps({'error': 'Failed to create conversation'})}\n\n".encode('utf-8')
                return StreamingResponse(error_stream(), media_type="text/event-stream")
            
            # Use the conversation ID from the result
            conversation_id = result["conversation_id"]
            logger.info(f"New conversation created with ID: {conversation_id}")
            conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        
        # STEP 2: Save user message - Critical database operation
        message_id = generate_id()
        message = Message(
            id=message_id,
            conversation_id=conversation.id,
            role="user",
            content=message_text
        )
        db.add(message)
        
        # Update timestamp
        conversation.updated_at = datetime.now()
        
        # STEP 3: Pre-create the assistant message with empty content
        # This ensures the message exists in the database even if streaming fails
        assistant_message = Message(
            id=assistant_message_id,
            conversation_id=conversation.id,
            role="assistant",
            content="",  # Empty content that will be updated during streaming
            status="streaming"  # Add a status field to track progress
        )
        db.add(assistant_message)
        
        # Commit both user message and assistant message placeholder
        try:
            db.commit()
            logger.info(f"Successfully saved user message and assistant placeholder: user={message_id}, assistant={assistant_message_id}")
        except Exception as e:
            logger.error(f"Database commit failed: {str(e)}")
            db.rollback()
            raise
        
        # Get previous messages for conversation context (up to 32k context)
        # 1. First get all messages for this conversation
        previous_messages = db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at).all()
        
        # 2. Format messages for the context window
        formatted_messages = []
        
        # 3. Add system message first
        formatted_messages.append({
            "role": "system", 
            "content": "You are a helpful AI assistant that answers questions accurately and concisely. You have access to the complete conversation history for context."
        })
        
        # 4. Add previous messages (excluding the current user message which we'll add last)
        for prev_msg in previous_messages:
            if prev_msg.id != message_id:  # Skip the current message
                formatted_messages.append({
                    "role": prev_msg.role,
                    "content": strip_editor_html(prev_msg.content)
                })
        
        # 5. Add the current message last
        formatted_messages.append({
            "role": "user",
            "content": strip_editor_html(message_text)
        })
        
        # Log conversation length
        logger.info(f"Including {len(formatted_messages)} messages in conversation context")
        
        # Create request object with model name (required by Ollama)
        request_body = {
            "messages": formatted_messages,
            "model": settings.default_model,  # Use the model configured in settings
            "stream": True,
            "temperature": settings.temperature,
            "conversation_id": conversation_id,
            "message_id": message_id,
            "assistant_message_id": assistant_message_id,  # Ensure this is included
            # Include tools if enabled in settings
            **({"tools": []} if settings.tool_calling_enabled else {})
        }
        
        # Add assistant message ID if provided by frontend
        if assistant_message_id:
            request_body["assistant_message_id"] = assistant_message_id
            logger.info(f"Using frontend-provided assistant message ID: {assistant_message_id}")
            
        # Add headers for client type detection
        if headers:
            request_body["headers"] = headers
            logger.info(f"Client headers: {headers}")
            
        # Create the request object with our complete body
        request_obj = QueuedRequest(
            priority=RequestPriority.WEB_INTERFACE,
            endpoint="/api/chat/completions",
            body=request_body,
            user_id=user.id
        )
        
        # STEP 1: Extract assistant_message_id ONCE for consistency
        assistant_message_id = request_obj.body.get("assistant_message_id")
        
        if not assistant_message_id:
            assistant_message_id = generate_id()
            logger.warning(f"No assistant_message_id provided by frontend - generated new ID: {assistant_message_id}")
            # Store the generated ID back in the request body for consistent access
            request_obj.body["assistant_message_id"] = assistant_message_id
        else:
            logger.info(f"Using frontend-provided assistant message ID: {assistant_message_id}")
            
        # Log detailed verification of the assistant_message_id
        logger.info(f"VERIFICATION: assistant_message_id is set to '{assistant_message_id}' and stored in request_obj.body")
        
        # STEP 1: Determine transport mode early
        transport_mode = request_obj.body.get("transport_mode")
        
        # Fallback to header-based detection if transport_mode is not explicitly set
        if not transport_mode:
            request_headers = request_obj.body.get("headers", {})
            is_websocket_client = request_headers.get("Connection") == "Upgrade" and "Upgrade" in request_headers
            transport_mode = "websocket" if is_websocket_client else "sse"
        
        logger.info(f"Using transport mode: {transport_mode}")
        
        # Add request to queue
        try:
            logger.info(f"Adding request to queue: user={user.id}, conversation={conversation_id}, priority={request_obj.priority.name if hasattr(request_obj.priority, 'name') else request_obj.priority}")
            
            # Add the request to the queue
            queue_position = await queue_manager.add_request(request_obj)
            
            # Check if request was added to queue successfully
            if queue_position < 0:
                # Distinguish between "already processing" (-2) and other errors
                if queue_position == -2:
                    logger.warning(f"Message is already being processed: message_id={assistant_message_id}")
                    error_message = "This message is already being processed."
                else:
                    logger.error(f"Failed to add message to queue: position={queue_position}, conversation_id={conversation_id}")
                    error_message = "Failed to add message to queue. Please try again."
                
                if transport_mode == "websocket":
                    await manager.send_update(user.id, {
                        "type": "message_update",
                        "message_id": assistant_message_id,
                        "conversation_id": conversation_id,
                        "status": "ERROR",
                        "error": error_message
                    })
                    # For WebSocket failures, still return a valid HTTP response
                    response_data = {
                        "error": error_message,
                        "success": False
                    }
                    async def error_response_stream():
                        yield json.dumps(response_data).encode('utf-8')
                    return StreamingResponse(error_response_stream(), media_type="application/json")
                else:
                    # For SSE clients, return error in SSE format
                    async def error_sse_stream():
                        yield f"data: {json.dumps({'error': error_message})}\n\n".encode('utf-8')
                    return StreamingResponse(error_sse_stream(), media_type="text/event-stream")
            
            # Successfully added to queue
            logger.info(f"Successfully added request to queue: position={queue_position}")
            
            # Track for WebSocket updates - HAPPENS FOR ALL CLIENTS
            manager.track_request(request_obj.timestamp.timestamp(), user.id)
            
            # ARCHITECTURAL CHANGE: Now we branch for different response types
            # after ensuring the request is always added to queue
        except Exception as e:
            logger.error(f"Error adding request to queue: {e}")
            # Handle error consistently for both client types
            if transport_mode == "websocket":
                await manager.send_update(user.id, {
                    "type": "message_update",
                    "message_id": assistant_message_id,
                    "conversation_id": conversation_id,
                    "status": "ERROR",
                    "error": str(e)
                })
                # For WebSocket clients - return JSON error
                response_data = {
                    "error": str(e),
                    "success": False
                }
                async def exception_response_stream():
                    yield json.dumps(response_data).encode('utf-8')
                return StreamingResponse(exception_response_stream(), media_type="application/json")
            else:
                # For SSE clients, return error in SSE format
                async def exception_sse_stream():
                    yield f"data: {json.dumps({'error': str(e)})}\n\n".encode('utf-8')
                return StreamingResponse(exception_sse_stream(), media_type="text/event-stream")
        
        # STEP 3: Define separate streaming function for WebSocket clients
        async def process_streaming_for_websocket():
            """Process streaming for WebSocket clients without blocking HTTP response"""
            assistant_content = ""
            model_used = settings.default_model
            is_first_update = True  # Track first token for periodic updates
            last_db_update_time = time.time()
            update_frequency = 5.0  # Update database every 5 seconds during streaming
            
            try:
                # First update to show processing has started
                await manager.send_update(user.id, {
                    "type": "message_update",
                    "message_id": assistant_message_id,
                    "conversation_id": conversation_id,
                    "status": "STREAMING",
                    "assistant_content": ""
                })
                
                # Stream from Ollama via queue manager
                chunks_processed = 0
                token_count = 0
                logger.info(f"Starting to process streaming chunks from queue manager for WebSocket client")
                
                # Process streaming request
                async for chunk in queue_manager.process_streaming_request(request_obj):
                    chunks_processed += 1
                    
                    # Log the raw chunk for debugging with chunk number
                    if chunks_processed % 50 == 0:  # Log every 50th chunk to reduce log volume
                        logger.info(f"[Chunk #{chunks_processed}] Processed WebSocket streaming chunk")
                    
                    try:
                        # Parse the JSON data
                        data = json.loads(chunk)
                        
                        token = ""
                        is_complete = False
                        
                        # Extract token from various formats
                        if "choices" in data and len(data["choices"]) > 0:
                            choice = data["choices"][0]
                            if "delta" in choice and "content" in choice["delta"]:
                                token = choice["delta"]["content"]
                            elif "text" in choice:
                                token = choice["text"]
                            elif "message" in choice and "content" in choice["message"]:
                                token = choice["message"]["content"]
                            
                            if "finish_reason" in choice and choice["finish_reason"] is not None:
                                is_complete = True
                        # Handle Ollama direct format (commonly used with Chinese models)
                        elif "message" in data and "content" in data["message"]:
                            token = data["message"]["content"]
                            if "done" in data and data["done"] == True:
                                is_complete = True
                        # Try other formats
                        elif "response" in data:
                            token = data["response"]
                        elif "content" in data:
                            token = data["content"]
                        
                        # Extract model information if available
                        if "model" in data:
                            model_used = data["model"]
                        
                        # Handle the case where we don't have a token
                        if not token and isinstance(data, dict):
                            # If this appears to be a metadata message (for completion)
                            if "model" in data or "done" in data or "total_duration" in data:
                                logger.info(f"Received metadata message: {str(data)[:100]}")
                                
                                # Store metadata separately instead of as content
                                metadata = data.copy()
                                
                                # Extract model if available
                                if "model" in metadata:
                                    model_used = metadata["model"]
                                
                                # Create a properly structured message with metadata separate from content
                                websocket_message = {
                                    "type": "message_update",
                                    "message_id": assistant_message_id,
                                    "conversation_id": conversation_id,
                                    "status": "STREAMING" if not is_complete else "COMPLETE",
                                    "assistant_content": "",  # No content in this update - it's just metadata
                                    "is_complete": is_complete,
                                    "metadata": metadata  # Include metadata in proper field
                                }
                                
                                # Send update and continue to next iteration
                                await manager.send_update(user.id, websocket_message)
                                continue
                            else:
                                # If not metadata but still no token, log and continue
                                logger.warning(f"Couldn't extract token from data: {str(data)[:100]}")
                                token = ""
                        
                        # Skip empty tokens
                        if not token:
                            continue
                        
                        # Accumulate content
                        assistant_content += token
                        token_count += 1
                        
                        # Create WebSocket update message
                        websocket_message = {
                            "type": "message_update",
                            "message_id": assistant_message_id,
                            "conversation_id": conversation_id,
                            "status": "STREAMING",
                            "assistant_content": token,
                            "is_complete": is_complete,
                            "metadata": {}  # Always include metadata field for consistency
                        }
                        
                        # For Ollama format, include model info in metadata field
                        if "model" in data:
                            websocket_message["metadata"]["model"] = data["model"]
                        
                        # For completeness detection
                        if is_complete or (data.get("done") == True):
                            websocket_message["is_complete"] = True
                            websocket_message["status"] = "COMPLETE"
                        
                        # Send WebSocket update
                        await manager.send_update(user.id, websocket_message)
                        
                        # Also send section-specific updates if needed
                        if "<think>" in token or "</think>" in token:
                            # This is a thinking section token
                            await manager.send_section_update(
                                user_id=user.id,
                                message_id=assistant_message_id,
                                conversation_id=conversation_id,
                                section="thinking",
                                content=token,
                                is_complete=is_complete,
                                operation=APPEND
                            )
                        
                        # Periodically update the database with current content
                        # This ensures partial messages are saved even if interrupted
                        current_time = time.time()
                        if is_first_update or is_complete or (current_time - last_db_update_time > update_frequency):
                            is_first_update = False
                            last_db_update_time = current_time
                            
                            # Use get_db to get a fresh session for each update
                            update_db = SessionLocal()
                            try:
                                # Try to find existing message first
                                existing_message = update_db.query(Message).filter(
                                    Message.id == assistant_message_id
                                ).first()
                                
                                if existing_message:
                                    # Update existing message
                                    existing_message.content = assistant_content
                                    existing_message.status = "complete" if is_complete else "streaming"
                                    existing_message.model = model_used
                                else:
                                    # Create new message if it doesn't exist (shouldn't happen, but as a fallback)
                                    new_message = Message(
                                        id=assistant_message_id,
                                        conversation_id=conversation_id,
                                        role="assistant",
                                        content=assistant_content,
                                        status="complete" if is_complete else "streaming",
                                        model=model_used
                                    )
                                    update_db.add(new_message)
                                
                                # Update conversation last modified time
                                conversation_record = update_db.query(Conversation).filter(
                                    Conversation.id == conversation_id
                                ).first()
                                
                                if conversation_record:
                                    conversation_record.updated_at = datetime.now()
                                
                                # Commit the changes
                                update_db.commit()
                                logger.debug(f"Updated assistant message in database, id={assistant_message_id}, length={len(assistant_content)}")
                            except Exception as db_error:
                                logger.error(f"Error updating message in database: {db_error}")
                                update_db.rollback()
                            finally:
                                update_db.close()
                    except json.JSONDecodeError:
                        # Not JSON, probably raw text
                        logger.warning(f"[Chunk #{chunks_processed}] Failed to parse as JSON")
                        
                        # Use chunk as the token directly
                        token = chunk
                        is_complete = False
                        
                        # Check if this is the last chunk (some models signal this)
                        if "[DONE]" in chunk or "<|endoftext|>" in chunk:
                            is_complete = True
                            # Remove marker from token
                            token = token.replace("[DONE]", "").replace("<|endoftext|>", "")
                        
                        # Accumulate content
                        assistant_content += token
                        
                        # Send a simplified message for non-JSON responses
                        await manager.send_update(user.id, {
                            "type": "message_update",
                            "message_id": assistant_message_id,
                            "conversation_id": conversation_id,
                            "status": "STREAMING",
                            "assistant_content": token,
                            "is_complete": is_complete
                        })
                    except Exception as e:
                        logger.error(f"Error processing chunk: {e}")
                
                # Final message save to database
                final_db = SessionLocal()
                try:
                    # First try to find the message
                    existing_message = final_db.query(Message).filter(
                        Message.id == assistant_message_id
                    ).first()
                    
                    if existing_message:
                        # Update existing message with final content
                        existing_message.content = assistant_content
                        existing_message.status = "complete"
                        existing_message.model = model_used
                    else:
                        # Create new message if it doesn't exist somehow
                        final_message = Message(
                            id=assistant_message_id,
                            conversation_id=conversation_id,
                            role="assistant",
                            content=assistant_content,
                            status="complete",
                            model=model_used
                        )
                        final_db.add(final_message)
                    
                    # Update conversation last modified time
                    conversation_record = final_db.query(Conversation).filter(
                        Conversation.id == conversation_id
                    ).first()
                    
                    if conversation_record:
                        conversation_record.updated_at = datetime.now()
                    
                    # Commit the final changes
                    final_db.commit()
                    logger.info(f"Saved final assistant message to database, id={assistant_message_id}, length={len(assistant_content)}")
                    
                    # Final update to WebSocket clients
                    final_websocket_message = {
                        "type": "message_update",
                        "message_id": assistant_message_id,
                        "conversation_id": conversation_id,
                        "status": "COMPLETE",
                        "assistant_content": assistant_content,
                        "is_complete": True,
                        "content_update_mode": "REPLACE",  # Mark this as a replace operation
                        "is_final_message": True,  # Additional flag to identify final message
                        "model": model_used  # Include the model used
                    }
                    
                    logger.info(f"Sending final completion message to WebSocket clients, id={assistant_message_id}")
                    await manager.send_update(user.id, final_websocket_message)
                except Exception as final_db_error:
                    logger.error(f"Error saving final message to database: {final_db_error}")
                    final_db.rollback()
                finally:
                    final_db.close()
            except Exception as e:
                logger.error(f"Streaming error in background task: {e}")
                
                # Try to update the message status in the database
                error_db = SessionLocal()
                try:
                    # Try to find the message
                    error_message = error_db.query(Message).filter(
                        Message.id == assistant_message_id
                    ).first()
                    
                    if error_message:
                        # Mark as error with current content
                        error_message.status = "error"
                        error_message.content = assistant_content or f"Error: {str(e)}"
                        error_db.commit()
                        logger.info(f"Updated message status to error in database, id={assistant_message_id}")
                except Exception as db_error:
                    logger.error(f"Error updating message status in database: {db_error}")
                    error_db.rollback()
                finally:
                    error_db.close()
                
                # Send error to WebSocket client
                await manager.send_update(user.id, {
                    "type": "message_update",
                    "message_id": assistant_message_id,
                    "conversation_id": conversation_id,
                    "status": "ERROR",
                    "error": str(e),
                    "is_complete": True
                })
            finally:
                # Cleanup
                manager.untrack_request(request_obj.timestamp.timestamp())
        
        # STEP 4: Simplified event_stream function for SSE clients
        async def event_stream():
            """Stream response for SSE clients"""
            assistant_content = ""
            model_used = settings.default_model
            is_first_update = True
            last_db_update_time = time.time()
            update_frequency = 5.0  # Update database every 5 seconds during streaming
            
            try:
                # Stream from Ollama via queue manager
                chunks_processed = 0
                logger.info(f"Starting to process streaming chunks from queue manager for SSE client")
                
                # First update only for WebSocket clients - use assistant_message_id
                if transport_mode == "websocket":
                    await manager.send_update(user.id, {
                        "type": "message_update",
                        "message_id": assistant_message_id, # Use assistant ID consistently
                        "conversation_id": conversation_id,
                        "status": "STREAMING",
                        "assistant_content": ""
                    })
                
                # Stream from Ollama via queue manager
                chunks_processed = 0
                token_count = 0
                logger.info(f"Starting to process streaming chunks from queue manager, transport_mode={transport_mode}")
                
                async for chunk in queue_manager.process_streaming_request(request_obj):
                    chunks_processed += 1
                    
                    # For SSE clients - send in SSE format
                    if transport_mode == "sse":
                        yield f"data: {chunk}\n\n".encode('utf-8')
                    
                    # Parse and process chunk content for database updates
                    try:
                        data = json.loads(chunk)
                        
                        # Extract token from various formats
                        token = ""
                        is_complete = False
                        
                        # Extract model information if available
                        if "model" in data:
                            model_used = data["model"]
                        
                        # Extract token from various formats
                        if "choices" in data and len(data["choices"]) > 0:
                            choice = data["choices"][0]
                            if "delta" in choice and "content" in choice["delta"]:
                                token = choice["delta"]["content"]
                            elif "text" in choice:
                                token = choice["text"]
                            elif "message" in choice and "content" in choice["message"]:
                                token = choice["message"]["content"]
                            
                            if "finish_reason" in choice and choice["finish_reason"] is not None:
                                is_complete = True
                        # Handle Ollama direct format (commonly used with Chinese models)
                        elif "message" in data and "content" in data["message"]:
                            token = data["message"]["content"]
                            if "done" in data and data["done"] == True:
                                is_complete = True
                        # Try other formats
                        elif "response" in data:
                            token = data["response"]
                        elif "content" in data:
                            token = data["content"]
                        
                        # Skip empty tokens
                        if token:
                            # Accumulate content for database
                            assistant_content += token
                            token_count += 1
                            
                            # Periodically update the database with current content
                            # This ensures partial messages are saved even if interrupted
                            current_time = time.time()
                            if is_first_update or is_complete or (current_time - last_db_update_time > update_frequency):
                                is_first_update = False
                                last_db_update_time = current_time
                                
                                # Use a fresh session for each update
                                update_db = SessionLocal()
                                try:
                                    # Try to find existing message first
                                    existing_message = update_db.query(Message).filter(
                                        Message.id == assistant_message_id
                                    ).first()
                                    
                                    if existing_message:
                                        # Update existing message
                                        existing_message.content = assistant_content
                                        existing_message.status = "complete" if is_complete else "streaming"
                                        existing_message.model = model_used
                                    else:
                                        # Create new message if it doesn't exist (shouldn't happen, but as a fallback)
                                        new_message = Message(
                                            id=assistant_message_id,
                                            conversation_id=conversation_id,
                                            role="assistant",
                                            content=assistant_content,
                                            status="complete" if is_complete else "streaming",
                                            model=model_used
                                        )
                                        update_db.add(new_message)
                                    
                                    # Update conversation last modified time
                                    conversation_record = update_db.query(Conversation).filter(
                                        Conversation.id == conversation_id
                                    ).first()
                                    
                                    if conversation_record:
                                        conversation_record.updated_at = datetime.now()
                                    
                                    # Commit the changes
                                    update_db.commit()
                                    logger.debug(f"Updated assistant message in database, id={assistant_message_id}, length={len(assistant_content)}")
                                except Exception as db_error:
                                    logger.error(f"Error updating message in database: {db_error}")
                                    update_db.rollback()
                                finally:
                                    update_db.close()
                    except json.JSONDecodeError:
                        # For non-JSON data, still try to update the database
                        # Non-JSON data is usually plain text or malformed JSON
                        assistant_content += chunk
                    except Exception as parse_error:
                        logger.error(f"Error parsing chunk: {parse_error}")
                        
                    # Process and send via WebSocket only for WebSocket clients
                    if transport_mode == "websocket":
                        try:
                            # Parse the JSON data with detailed logging
                            data = json.loads(chunk)
                            
                            token = ""
                            is_complete = False
                            token_found = False
                            
                            # Extract token from various formats
                            if "choices" in data and len(data["choices"]) > 0:
                                choice = data["choices"][0]
                                if "delta" in choice and "content" in choice["delta"]:
                                    token = choice["delta"]["content"]
                                elif "text" in choice:
                                    token = choice["text"]
                                elif "message" in choice and "content" in choice["message"]:
                                    token = choice["message"]["content"]
                                
                                if "finish_reason" in choice and choice["finish_reason"] is not None:
                                    is_complete = True
                            # Handle Ollama direct format (commonly used with Chinese models)
                            elif "message" in data and "content" in data["message"]:
                                token = data["message"]["content"]
                                if "done" in data and data["done"] == True:
                                    is_complete = True
                            # Try other formats
                            elif "response" in data:
                                token = data["response"]
                            elif "content" in data:
                                token = data["content"]
                            
                            # Handle the case where we don't have a token
                            if not token and isinstance(data, dict):
                                # If this appears to be a metadata message (for completion)
                                if "model" in data or "done" in data or "total_duration" in data:
                                    logger.info(f"Received metadata message: {str(data)[:100]}")
                                    
                                    # Store metadata separately instead of as content
                                    metadata = data.copy()
                                    token = ""
                                    
                                    # Create a properly structured message with metadata separate from content
                                    websocket_message = {
                                        "type": "message_update",
                                        "message_id": assistant_message_id,
                                        "conversation_id": conversation_id,
                                        "status": "STREAMING" if not is_complete else "COMPLETE",
                                        "assistant_content": "",  # No content in this update - it's just metadata
                                        "is_complete": is_complete,
                                        "metadata": metadata  # Include metadata in proper field
                                    }
                                    
                                    # Send update and continue to next iteration
                                    await manager.send_update(user.id, websocket_message)
                                    continue
                                else:
                                    # If not metadata but still no token, log and continue
                                    logger.warning(f"Couldn't extract token from data: {str(data)[:100]}")
                                    token = ""
                            
                            # Skip empty tokens to avoid duplicate content issues
                            if not token:
                                continue
                                
                            # Accumulate content only for actual tokens
                            assistant_content += token
                            
                            # Create a clean WebSocket message with proper structure
                            # Use consistent message ID
                            current_assistant_id = request_obj.body.get("assistant_message_id")
                            if assistant_message_id != current_assistant_id and current_assistant_id:
                                logger.error(f"CRITICAL ERROR: ID MISMATCH! Variable assistant_message_id={assistant_message_id} doesn't match request body assistant_message_id={current_assistant_id}")
                                # Use the same ID consistently throughout the entire request
                                logger.warning(f"Correcting ID mismatch - using request body value: {current_assistant_id}")
                                assistant_message_id = current_assistant_id
                            
                            # Create properly structured message with content and metadata separated
                            websocket_message = {
                                "type": "message_update",
                                "message_id": assistant_message_id,
                                "conversation_id": conversation_id,
                                "status": "STREAMING",
                                "assistant_content": token,
                                "is_complete": is_complete,
                                "metadata": {}  # Always include metadata field for consistency
                            }
                            
                            # Log the message ID for first token only
                            if token and token[0] != " ":
                                logger.info(f"WebSocket message using message_id: {assistant_message_id}")
                            
                            # Put model info in metadata field, not in the main message
                            if "model" in data:
                                websocket_message["metadata"]["model"] = data["model"]
                            
                            # For completeness detection
                            if is_complete or (data.get("done") == True):
                                websocket_message["is_complete"] = True
                                websocket_message["status"] = "COMPLETE"
                            
                            # Send to WebSocket clients - no SSE formatting
                            # Only send WebSocket updates for WebSocket transport mode
                            await manager.send_update(user.id, websocket_message)
                            
                            # Also send section-specific updates if needed
                            if "<think>" in token or "</think>" in token:
                                # This is a thinking section token
                                # Section updates only for WebSocket clients
                                await manager.send_section_update(
                                    user_id=user.id,
                                    message_id=assistant_message_id, # Use assistant ID consistently
                                    conversation_id=conversation_id,
                                    section="thinking",
                                    content=token,
                                    is_complete=is_complete,
                                    operation=APPEND
                                )
                        except Exception as e:
                            # Not JSON, probably raw text
                            logger.warning(f"[Chunk #{chunks_processed}] Failed to parse as JSON: {str(e)}")
                            logger.warning(f"[Chunk #{chunks_processed}] Raw chunk type: {type(chunk)}, length: {len(chunk)}")
                            logger.warning(f"[Chunk #{chunks_processed}] Raw chunk content: {chunk[:100]}...")
                            
                            # Use chunk as the token directly
                            token = chunk
                            is_complete = False
                            
                            # Log attempt at handling
                            logger.info(f"[Chunk #{chunks_processed}] Treating as raw text, length: {len(token)}")
                            
                            # Check if this is the last chunk (some models signal this)
                            if "[DONE]" in chunk or "<|endoftext|>" in chunk:
                                is_complete = True
                                # Remove marker from token
                                token = token.replace("[DONE]", "").replace("<|endoftext|>", "")
                            
                            # Accumulate content
                            assistant_content += token
                            
                            # Send a simplified message for non-JSON responses, but only for WebSocket clients
                            # Double-check that we're using the correct ID from the request body
                            current_assistant_id = request_obj.body.get("assistant_message_id")
                            if assistant_message_id != current_assistant_id and current_assistant_id:
                                logger.warning(f"ID MISMATCH in non-JSON path! Using request body ID: {current_assistant_id} instead of {assistant_message_id}")
                                assistant_message_id = current_assistant_id
                                
                            await manager.send_update(user.id, {
                                "type": "message_update",
                                "message_id": assistant_message_id, # Use assistant ID consistently
                                "conversation_id": conversation_id,
                                "status": "STREAMING",
                                "assistant_content": token,
                                "is_complete": is_complete
                            })
                        
                        # No need to yield to HTTP client again, already done above
                
                # Final message save to database
                final_db = SessionLocal()
                try:
                    # First try to find the message
                    existing_message = final_db.query(Message).filter(
                        Message.id == assistant_message_id
                    ).first()
                    
                    if existing_message:
                        # Update existing message with final content
                        existing_message.content = assistant_content
                        existing_message.status = "complete"
                        existing_message.model = model_used
                    else:
                        # Create new message if it doesn't exist somehow
                        final_message = Message(
                            id=assistant_message_id,
                            conversation_id=conversation_id,
                            role="assistant",
                            content=assistant_content,
                            status="complete",
                            model=model_used
                        )
                        final_db.add(final_message)
                    
                    # Update conversation last modified time
                    conversation_record = final_db.query(Conversation).filter(
                        Conversation.id == conversation_id
                    ).first()
                    
                    if conversation_record:
                        conversation_record.updated_at = datetime.now()
                    
                    # Commit the final changes
                    final_db.commit()
                    logger.info(f"Saved final assistant message to database, id={assistant_message_id}, length={len(assistant_content)}")
                    
                    # Final update to WebSocket clients - clean format without SSE
                    if transport_mode == "websocket":
                        # CRITICAL: Verify we're using the correct message_id for the final update
                        current_assistant_id = request_obj.body.get("assistant_message_id")
                        if assistant_message_id != current_assistant_id and current_assistant_id:
                            logger.warning(f"ID MISMATCH in final update! Using request body ID: {current_assistant_id} instead of {assistant_message_id}")
                            assistant_message_id = current_assistant_id
                            
                        final_websocket_message = {
                            "type": "message_update",
                            "message_id": assistant_message_id, # Use assistant ID consistently
                            "conversation_id": conversation_id,
                            "status": "COMPLETE",
                            "assistant_content": assistant_content,
                            "is_complete": True,
                            "content_update_mode": "REPLACE",  # Mark this as a replace operation
                            "is_final_message": True,  # Additional flag to identify final message
                            "model": model_used  # Include model used
                        }
                        
                        # Log the final message ID to verify consistency
                        logger.info(f"FINAL WebSocket message using message_id: {assistant_message_id}")
                        
                        logger.info("Sending final completion message to WebSocket clients")
                        await manager.send_update(user.id, final_websocket_message)
                except Exception as final_db_error:
                    logger.error(f"Error saving final message to database: {final_db_error}")
                    final_db.rollback()
                finally:
                    final_db.close()
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                
                # Error handling should respect transport mode
                
                # For SSE clients - send error in SSE format 
                if transport_mode == "sse":
                    yield f"data: {json.dumps({'error': str(e)})}\n\n".encode('utf-8')
                
                # For WebSocket clients - send clean JSON error without SSE format
                if transport_mode == "websocket":
                    # One more ID verification for error messages
                    current_assistant_id = request_obj.body.get("assistant_message_id")
                    if assistant_message_id != current_assistant_id and current_assistant_id:
                        logger.warning(f"ID MISMATCH in error message! Using request body ID: {current_assistant_id} instead of {assistant_message_id}")
                        assistant_message_id = current_assistant_id
                        
                    error_message = {
                        "type": "message_update",
                        "message_id": assistant_message_id, # Use assistant ID consistently
                        "conversation_id": conversation_id,
                        "status": "ERROR",
                        "error": str(e),
                        "is_complete": True  # Mark as complete so frontend stops waiting
                    }
                    
                    logger.info(f"Sending error message to WebSocket clients: {str(e)}")
                    await manager.send_update(user.id, error_message)
            finally:
                # Clean up
                manager.untrack_request(request_obj.timestamp.timestamp())
        
        # STEP 5: Branch based on transport mode for the response
        # Now we can choose the appropriate response method after ensuring the message is in the queue
        if transport_mode == "websocket":
            # Verify headers for WebSocket usage
            if not headers or not (headers.get("Connection") == "Upgrade" and "Upgrade" in headers):
                logger.warning("Client requested WebSocket transport but didn't provide WebSocket headers - potential protocol mismatch")
            
            # Create background task to handle WebSocket streaming without blocking response
            asyncio.create_task(process_streaming_for_websocket())
            
            # Return quick HTTP response for WebSocket client
            response_data = {
                "id": assistant_message_id,
                "conversation_id": conversation_id,
                "content": "",
                "created_at": datetime.now().isoformat(),
                "role": "assistant",
                "status": "streaming",
                "websocket_mode": True,
                "success": True,
                "queue_position": queue_position
            }
            
            logger.info(f"Created background task for WebSocket streaming")
            
            async def response_stream():
                yield json.dumps(response_data).encode('utf-8')
                
            return StreamingResponse(response_stream(), media_type="application/json")
        else:
            # SSE clients use traditional streaming response
            logger.info("Using SSE streaming response")
            return StreamingResponse(event_stream(), media_type="text/event-stream")
    
    except Exception as e:
        logger.error(f"Error setting up streaming: {e}")
        
        # Cleanup
        try:
            fresh_db.rollback()
        except:
            pass
        finally:
            fresh_db.close()
        
        # Error stream
        async def error_stream():
            yield f"data: {json.dumps({'error': str(e)})}\n\n".encode('utf-8')
        
        return StreamingResponse(error_stream(), media_type="text/event-stream")