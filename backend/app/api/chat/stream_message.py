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
from .token_service import count_messages_tokens
from .summarization_service import SummarizationService
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
    # Extract all required IDs once at the beginning and use consistently
    if not assistant_message_id:
        assistant_message_id = generate_id()
        logger.info(f"No assistant_message_id provided, generated: {assistant_message_id}")
    
    user_message_id = generate_id()
    transport_mode = "websocket" if headers and headers.get("Connection") == "Upgrade" else "sse"
    
    logger.info(f"Request info: conversation_id={conversation_id}, assistant_id={assistant_message_id}, transport={transport_mode}")
    
    # STEP 1: Database operations - Create/get conversation and save messages
    try:
        # Handle conversation creation/retrieval
        if not conversation_id or conversation_id.lower() == "new":
            # Create new conversation
            conversation = Conversation(
                id=generate_id(),
                user_id=user.id,
                title=message_text[:50] if message_text else "New Conversation"
            )
            db.add(conversation)
            db.flush()  # Validate the object is created but don't commit yet
            conversation_id = conversation.id
            logger.info(f"Created new conversation: {conversation_id}")
        else:
            # Get existing conversation
            conversation = db.query(Conversation).filter(
                Conversation.id == conversation_id,
                Conversation.user_id == user.id
            ).first()
            
            if not conversation:
                logger.error(f"Conversation not found: {conversation_id}")
                async def error_stream():
                    error_data = {"error": "Conversation not found"}
                    if transport_mode == "sse":
                        yield f"data: {json.dumps(error_data)}\n\n".encode('utf-8')
                    else:
                        yield json.dumps(error_data).encode('utf-8')
                return StreamingResponse(error_stream(), 
                          media_type="text/event-stream" if transport_mode == "sse" else "application/json")
        
        # Update conversation timestamp
        conversation.updated_at = datetime.now()
        
        # Save user message (without status/model to ensure compatibility)
        user_message = Message(
            id=user_message_id,
            conversation_id=conversation_id,
            role="user",
            content=message_text
        )
        db.add(user_message)
        
        # Create assistant message placeholder
        # Only include core fields (in case status and model columns don't exist)
        try:
            assistant_message = Message(
                id=assistant_message_id,
                conversation_id=conversation_id,
                role="assistant",
                content="",
                status="streaming"  # Add status if column exists
            )
        except Exception as column_error:
            # Fallback - create without status if column doesn't exist
            logger.warning(f"Creating message without status column: {column_error}")
            assistant_message = Message(
                id=assistant_message_id,
                conversation_id=conversation_id,
                role="assistant",
                content=""
            )
        db.add(assistant_message)
        
        # Commit all database changes in one transaction
        try:
            db.commit()
            logger.info(f"Database transaction successful: conversation={conversation_id}, user_msg={user_message_id}, assistant_msg={assistant_message_id}")
        except Exception as e:
            db.rollback()
            logger.error(f"Database transaction failed: {str(e)}")
            # Capture error message to avoid scope issues
            error_message = str(e)
            async def db_error_stream():
                error_data = {"error": f"Database error: {error_message}"}
                if transport_mode == "sse":
                    yield f"data: {json.dumps(error_data)}\n\n".encode('utf-8')
                else:
                    yield json.dumps(error_data).encode('utf-8')
            return StreamingResponse(db_error_stream(), 
                      media_type="text/event-stream" if transport_mode == "sse" else "application/json")
            
        
        # STEP 2: Prepare message context for LLM request with summarization
        # Initialize summarization service
        summarization_service = SummarizationService(db, user.id)
        
        # Check if summarization is needed
        needs_summarization, token_count = await summarization_service.check_context_size(conversation_id)
        
        # Generate summary if needed
        if needs_summarization:
            logger.info(f"Conversation {conversation_id} needs summarization ({token_count} tokens), generating summary...")
            success, summary_result = await summarization_service.generate_summary(conversation_id)
            if success:
                logger.info(f"Summary generated successfully: {len(summary_result)} chars")
            else:
                logger.warning(f"Summary generation failed: {summary_result}")
        
        # Get optimized context with summary and recent messages
        # Note: we set include_current_message=True because we'll add the current message next
        formatted_messages = summarization_service.get_optimized_context(conversation_id, include_current_message=True)
        
        # Add the current user message (not yet stored in the database)
        formatted_messages.append({
            "role": "user",
            "content": strip_editor_html(message_text)
        })
        
        # Log context info
        context_token_count = count_messages_tokens(formatted_messages, settings.default_model)
        logger.info(f"Including {len(formatted_messages)} messages in conversation context ({context_token_count} tokens)")
        
        # STEP 3: Create request object for queue
        request_body = {
            "messages": formatted_messages,
            "model": settings.default_model,
            "stream": True,
            "temperature": settings.temperature,
            "conversation_id": conversation_id,
            "message_id": user_message_id,
            "assistant_message_id": assistant_message_id,
            # Include tools if enabled
            **({"tools": []} if settings.tool_calling_enabled else {})
        }
        
        # Add headers for client type detection
        if headers:
            request_body["headers"] = headers
            
        # Create the queue request object
        request_obj = QueuedRequest(
            priority=RequestPriority.WEB_INTERFACE,
            endpoint="/api/chat/completions",
            body=request_body,
            user_id=user.id
        )
        
        # STEP 4: Add request to queue and handle response based on transport mode
        try:
            logger.info(f"Adding request to queue: user={user.id}, conversation={conversation_id}")
            
            # Add request to queue
            queue_position = await queue_manager.add_request(request_obj)
            
            # Check if request was added successfully
            if queue_position < 0:
                # Determine error message based on queue position
                if queue_position == -2:
                    error_message = "This message is already being processed."
                else:
                    error_message = "Failed to add message to queue. Please try again."
                
                logger.error(f"Queue error: {error_message}, position={queue_position}")
                
                # Send error via appropriate channel
                if transport_mode == "websocket":
                    await manager.send_update(user.id, {
                        "type": "message_update",
                        "message_id": assistant_message_id,
                        "conversation_id": conversation_id,
                        "status": "error",  # Use lowercase status for frontend compatibility
                        "error": error_message
                    })
                    
                    # Capture error message to avoid scope issues
                    captured_error = error_message
                    
                    # Return JSON response for WebSocket client
                    async def error_response_stream():
                        yield json.dumps({"error": captured_error, "success": False}).encode('utf-8')
                    return StreamingResponse(error_response_stream(), media_type="application/json")
                else:
                    # Capture error message to avoid scope issues
                    captured_error = error_message
                    
                    # Return SSE formatted error
                    async def error_sse_stream():
                        yield f"data: {json.dumps({'error': captured_error})}\n\n".encode('utf-8')
                    return StreamingResponse(error_sse_stream(), media_type="text/event-stream")
            
            # Successfully added to queue
            logger.info(f"Request added to queue: position={queue_position}")
            
            # Track request for WebSocket updates
            manager.track_request(request_obj.timestamp.timestamp(), user.id)
            
        except Exception as e:
            logger.error(f"Error adding request to queue: {e}")
            
            # Capture error message to avoid scope issues
            error_message = str(e)
            
            # Handle error based on transport mode
            if transport_mode == "websocket":
                # Send error via WebSocket - use lowercase status for frontend compatibility
                await manager.send_update(user.id, {
                    "type": "message_update",
                    "message_id": assistant_message_id,
                    "conversation_id": conversation_id,
                    "status": "error",
                    "error": error_message
                })
                
                # Return JSON response
                async def exception_response_stream():
                    yield json.dumps({"error": error_message, "success": False}).encode('utf-8')
                return StreamingResponse(exception_response_stream(), media_type="application/json")
            else:
                # Return SSE formatted error
                async def exception_sse_stream():
                    yield f"data: {json.dumps({'error': error_message})}\n\n".encode('utf-8')
                return StreamingResponse(exception_sse_stream(), media_type="text/event-stream")
        
        # STEP 5: Define WebSocket streaming handler
        async def process_streaming_for_websocket():
            """Process streaming for WebSocket clients without blocking HTTP response"""
            assistant_content = ""
            model_used = settings.default_model
            # Only update database once at the end, not during streaming
            
            try:
                # CRITICAL: Wait for client to signal readiness before processing
                logger.info(f"[READINESS-DEBUG] **STREAM START** WebSocket: beginning readiness wait for msgId={assistant_message_id[:8]}, convId={conversation_id[:8]}")
                
                # First check if we have valid connection
                connections = manager.active_connections.get(user.id, [])
                logger.info(f"[READINESS-DEBUG] Active WebSocket connections for user {user.id}: {len(connections)}")
                
                # Event-based logging for readiness wait
                logger.info(f"[READINESS-EVENT] WAIT_START user={user.id} msgId={assistant_message_id[:8]} convId={conversation_id[:8]}")
                wait_start = time.time()
                
                # Wait for client readiness
                client_ready = await manager.wait_for_client_ready(
                    message_id=assistant_message_id,
                    conversation_id=conversation_id,
                    user_id=user.id,
                    timeout=10.0  # Wait up to 10 seconds for client readiness
                )
                wait_duration = time.time() - wait_start
                
                # Log result of wait operation with detailed event info
                if not client_ready:
                    logger.warning(f"[READINESS-EVENT] WAIT_TIMEOUT user={user.id} msgId={assistant_message_id[:8]} duration={wait_duration:.2f}s")
                    logger.warning(f"[READINESS-DEBUG] **WAIT FAILED** Client not ready after {wait_duration:.2f}s, proceeding anyway for: msgId={assistant_message_id[:8]}")
                else:
                    logger.info(f"[READINESS-EVENT] WAIT_SUCCESS user={user.id} msgId={assistant_message_id[:8]} duration={wait_duration:.2f}s")
                    logger.info(f"[READINESS-DEBUG] **WAIT SUCCESS** Client ready after {wait_duration:.2f}s, beginning streaming: msgId={assistant_message_id[:8]}")
                
                # Initial update to show processing has started
                await manager.send_update(user.id, {
                    "type": "message_update",
                    "message_id": assistant_message_id,
                    "conversation_id": conversation_id,
                    "status": "streaming",
                    "assistant_content": ""
                })
                
                # Process streaming chunks
                chunks_processed = 0
                logger.info(f"Starting WebSocket streaming for message {assistant_message_id}")
                
                # Initialize database update variables
                last_db_update_time = time.time()
                update_frequency = 2.0  # Update database every 2 seconds
                
                # Process each chunk from the LLM
                async for chunk in queue_manager.process_streaming_request(request_obj):
                    chunks_processed += 1
                    
                    try:
                        # Parse JSON data
                        data = json.loads(chunk)
                        
                        # Extract token and completion status
                        token = ""
                        is_complete = False
                        
                        # Extract token from various LLM format variations
                        if "choices" in data and len(data["choices"]) > 0:
                            # OpenAI-style format
                            choice = data["choices"][0]
                            if "delta" in choice and "content" in choice["delta"]:
                                token = choice["delta"]["content"]
                            elif "text" in choice:
                                token = choice["text"]
                            elif "message" in choice and "content" in choice["message"]:
                                token = choice["message"]["content"]
                            
                            if "finish_reason" in choice and choice["finish_reason"] is not None:
                                is_complete = True
                                
                        elif "message" in data and "content" in data["message"]:
                            # Ollama format
                            token = data["message"]["content"]
                            if "done" in data and data["done"] == True:
                                is_complete = True
                                
                        elif "response" in data:
                            # Simple response format
                            token = data["response"]
                            
                        elif "content" in data:
                            # Direct content format
                            token = data["content"]
                        
                        # Extract model information if available
                        if "model" in data:
                            model_used = data["model"]
                        
                        # Handle metadata-only messages
                        if not token and isinstance(data, dict) and ("model" in data or "done" in data or "total_duration" in data):
                            # Send metadata update
                            await manager.send_update(user.id, {
                                "type": "message_update",
                                "message_id": assistant_message_id,
                                "conversation_id": conversation_id,
                                "status": "streaming" if not is_complete else "COMPLETE",
                                "assistant_content": "",
                                "is_complete": is_complete,
                                "metadata": data.copy()
                            })
                            continue
                        
                        # Skip empty tokens
                        if not token:
                            continue
                        
                        # Accumulate content
                        assistant_content += token
                        
                        # Send WebSocket update
                        await manager.send_update(user.id, {
                            "type": "message_update",
                            "message_id": assistant_message_id,
                            "conversation_id": conversation_id,
                            "status": "streaming",
                            "assistant_content": token,
                            "is_complete": is_complete,
                            "metadata": {"model": model_used} if model_used else {}
                        })
                        
                        # Handle special sections if needed
                        if "<think>" in token or "</think>" in token:
                            await manager.send_section_update(
                                user_id=user.id,
                                message_id=assistant_message_id,
                                conversation_id=conversation_id,
                                section="thinking",
                                content=token,
                                is_complete=is_complete,
                                operation=APPEND
                            )
                        
                        # Periodically update database
                        current_time = time.time()
                        if is_complete or (current_time - last_db_update_time > update_frequency):
                            last_db_update_time = current_time
                            
                            # Use a fresh database session
                            update_db = SessionLocal()
                            try:
                                # Update assistant message
                                message = update_db.query(Message).filter(
                                    Message.id == assistant_message_id
                                ).first()
                                
                                if message:
                                    message.content = assistant_content
                                    message.status = "complete" if is_complete else "streaming"
                                    message.model = model_used
                                    
                                    # Update conversation timestamp
                                    conversation = update_db.query(Conversation).filter(
                                        Conversation.id == conversation_id
                                    ).first()
                                    
                                    if conversation:
                                        conversation.updated_at = datetime.now()
                                    
                                    update_db.commit()
                                    logger.debug(f"Updated message in database: {assistant_message_id}, length={len(assistant_content)}")
                            except Exception as e:
                                logger.error(f"Error updating message in database: {e}")
                                update_db.rollback()
                            finally:
                                update_db.close()
                        
                    except json.JSONDecodeError:
                        # Handle raw text format
                        token = chunk
                        is_complete = "[DONE]" in chunk or "<|endoftext|>" in chunk
                        
                        if is_complete:
                            # Remove completion markers
                            token = token.replace("[DONE]", "").replace("<|endoftext|>", "")
                        
                        # Accumulate content
                        assistant_content += token
                        
                        # Send update
                        await manager.send_update(user.id, {
                            "type": "message_update",
                            "message_id": assistant_message_id,
                            "conversation_id": conversation_id,
                            "status": "streaming",
                            "assistant_content": token,
                            "is_complete": is_complete
                        })
                        
                    except Exception as e:
                        logger.error(f"Error processing chunk: {e}")
                
                # Save final message to database
                final_db = SessionLocal()
                try:
                    # Update message with final content
                    message = final_db.query(Message).filter(
                        Message.id == assistant_message_id
                    ).first()
                    
                    if message:
                        message.content = assistant_content
                        message.status = "complete"
                        message.model = model_used
                        
                        # Update conversation timestamp
                        conversation = final_db.query(Conversation).filter(
                            Conversation.id == conversation_id
                        ).first()
                        
                        if conversation:
                            conversation.updated_at = datetime.now()
                        
                        final_db.commit()
                        logger.info(f"Saved final message: id={assistant_message_id}, length={len(assistant_content)}")
                    
                    # Send final update to client
                    await manager.send_update(user.id, {
                        "type": "message_update",
                        "message_id": assistant_message_id,
                        "conversation_id": conversation_id,
                        "status": "complete",
                        "assistant_content": assistant_content,
                        "is_complete": True,
                        "content_update_mode": "REPLACE",
                        "is_final_message": True,
                        "model": model_used
                    })
                    
                except Exception as e:
                    logger.error(f"Error saving final message: {e}")
                    final_db.rollback()
                finally:
                    final_db.close()
                    
            except Exception as e:
                logger.error(f"Streaming error in WebSocket handler: {e}")
                
                # Update message status to error
                try:
                    error_db = SessionLocal()
                    message = error_db.query(Message).filter(
                        Message.id == assistant_message_id
                    ).first()
                    
                    if message:
                        message.status = "error"
                        message.content = assistant_content or f"Error: {str(e)}"
                        error_db.commit()
                except Exception as db_error:
                    logger.error(f"Error updating message error status: {db_error}")
                    error_db.rollback()
                finally:
                    error_db.close()
                
                # Send error to client
                await manager.send_update(user.id, {
                    "type": "message_update",
                    "message_id": assistant_message_id,
                    "conversation_id": conversation_id,
                    "status": "error",
                    "error": str(e),
                    "is_complete": True
                })
                
            finally:
                # Cleanup
                manager.untrack_request(request_obj.timestamp.timestamp())
                
                # Clear client readiness state
                await manager.clear_client_ready(
                    message_id=assistant_message_id,
                    conversation_id=conversation_id,
                    user_id=user.id
                )
        
        # STEP 6: Define SSE streaming handler
        async def event_stream():
            """Stream response for SSE clients"""
            assistant_content = ""
            model_used = settings.default_model
            # Only update database once at the end, not during streaming
            
            try:
                # CRITICAL: Wait for client to signal readiness before processing
                # Note: For SSE clients, we still wait for readiness signal via WebSocket
                logger.info(f"[READINESS-DEBUG] **STREAM START** SSE: beginning readiness wait for msgId={assistant_message_id[:8]}, convId={conversation_id[:8]}")
                
                # First check if we have valid connection
                connections = manager.active_connections.get(user.id, [])
                logger.info(f"[READINESS-DEBUG] Active WebSocket connections for user {user.id}: {len(connections)}")
                
                # Wait for client readiness
                wait_start = time.time()
                client_ready = await manager.wait_for_client_ready(
                    message_id=assistant_message_id,
                    conversation_id=conversation_id,
                    user_id=user.id,
                    timeout=10.0  # Wait up to 10 seconds for client readiness
                )
                wait_duration = time.time() - wait_start
                
                if not client_ready:
                    logger.warning(f"[READINESS-DEBUG] **WAIT FAILED** SSE client not ready after {wait_duration:.2f}s, proceeding anyway for: msgId={assistant_message_id[:8]}")
                else:
                    logger.info(f"[READINESS-DEBUG] **WAIT SUCCESS** SSE client ready after {wait_duration:.2f}s, beginning streaming: msgId={assistant_message_id[:8]}")
                
                # Process streaming chunks
                logger.info(f"Starting SSE streaming for message {assistant_message_id}")
                
                # Process each chunk from the LLM
                async for chunk in queue_manager.process_streaming_request(request_obj):
                    # For SSE clients, send chunk directly in SSE format
                    yield f"data: {chunk}\n\n".encode('utf-8')
                    
                    try:
                        # Also parse chunk for database updates
                        data = json.loads(chunk)
                        
                        # Extract token from various formats
                        token = ""
                        is_complete = False
                        
                        # Extract model information if available
                        if "model" in data:
                            model_used = data["model"]
                        
                        # Extract token from various LLM format variations
                        if "choices" in data and len(data["choices"]) > 0:
                            # OpenAI-style format
                            choice = data["choices"][0]
                            if "delta" in choice and "content" in choice["delta"]:
                                token = choice["delta"]["content"]
                            elif "text" in choice:
                                token = choice["text"]
                            elif "message" in choice and "content" in choice["message"]:
                                token = choice["message"]["content"]
                            
                            if "finish_reason" in choice and choice["finish_reason"] is not None:
                                is_complete = True
                        
                        elif "message" in data and "content" in data["message"]:
                            # Ollama format
                            token = data["message"]["content"]
                            if "done" in data and data["done"] == True:
                                is_complete = True
                        
                        elif "response" in data:
                            # Simple response format
                            token = data["response"]
                        
                        elif "content" in data:
                            # Direct content format
                            token = data["content"]
                        
                        # Skip empty tokens
                        if not token:
                            continue
                            
                        # Accumulate content for database updates
                        assistant_content += token
                        
                        # No database updates during streaming - only at the end
                                
                    except json.JSONDecodeError:
                        # For non-JSON data, just accumulate content
                        assistant_content += chunk
                    except Exception as e:
                        logger.error(f"Error processing SSE chunk: {e}")
                
                # Save final message to database
                final_db = SessionLocal()
                try:
                    # Update message with final content
                    message = final_db.query(Message).filter(
                        Message.id == assistant_message_id
                    ).first()
                    
                    if message:
                        message.content = assistant_content
                        message.status = "complete"
                        message.model = model_used
                        
                        # Update conversation timestamp
                        conversation = final_db.query(Conversation).filter(
                            Conversation.id == conversation_id
                        ).first()
                        
                        if conversation:
                            conversation.updated_at = datetime.now()
                        
                        final_db.commit()
                        logger.info(f"Saved final message: id={assistant_message_id}, length={len(assistant_content)}")
                        
                except Exception as e:
                    logger.error(f"Error saving final message: {e}")
                    final_db.rollback()
                finally:
                    final_db.close()
                    
            except Exception as e:
                logger.error(f"Streaming error in SSE handler: {e}")
                
                # Update message status to error
                try:
                    error_db = SessionLocal()
                    message = error_db.query(Message).filter(
                        Message.id == assistant_message_id
                    ).first()
                    
                    if message:
                        message.status = "error"
                        message.content = assistant_content or f"Error: {str(e)}"
                        error_db.commit()
                except Exception as db_error:
                    logger.error(f"Error updating message error status: {db_error}")
                    error_db.rollback()
                finally:
                    error_db.close()
                
                # Send error in SSE format
                yield f"data: {json.dumps({'error': str(e)})}\n\n".encode('utf-8')
                
            finally:
                # Cleanup
                manager.untrack_request(request_obj.timestamp.timestamp())
                
                # Clear client readiness state
                await manager.clear_client_ready(
                    message_id=assistant_message_id,
                    conversation_id=conversation_id,
                    user_id=user.id
                )
        
        # STEP 7: Return appropriate response based on transport mode
        if transport_mode == "websocket":
            # Start WebSocket streaming in background task
            asyncio.create_task(process_streaming_for_websocket())
            
            # Return quick HTTP response for WebSocket client
            response_data = {
                "id": assistant_message_id,
                "conversation_id": conversation_id,
                "content": "",
                "created_at": datetime.now().isoformat(),
                "role": "assistant",
                "status": "streaming",
                "success": True,
                "queue_position": queue_position
            }
            
            logger.info(f"Started WebSocket streaming in background task for {assistant_message_id}")
            
            async def response_stream():
                yield json.dumps(response_data).encode('utf-8')
                
            return StreamingResponse(response_stream(), media_type="application/json")
        else:
            # SSE clients use traditional streaming response
            logger.info(f"Starting SSE streaming response for {assistant_message_id}")
            return StreamingResponse(event_stream(), media_type="text/event-stream")
    
    except Exception as e:
        logger.error(f"Error setting up streaming: {e}")
        
        # Handle any uncaught exceptions at the top level
        try:
            db.rollback()
        except:
            pass
        
        # Capture error message to avoid scope issues
        error_message = str(e)
        
        # Return error in appropriate format based on transport mode
        if transport_mode == "websocket":
            # Return JSON error for WebSocket clients
            error_data = {"error": error_message, "success": False}
            
            async def json_error_stream():
                yield json.dumps(error_data).encode('utf-8')
            
            return StreamingResponse(json_error_stream(), media_type="application/json")
        else:
            # Return SSE formatted error
            async def sse_error_stream():
                yield f"data: {json.dumps({'error': error_message})}\n\n".encode('utf-8')
            
            return StreamingResponse(sse_error_stream(), media_type="text/event-stream")