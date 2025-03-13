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
    # Create a new conversation if needed
    fresh_db = SessionLocal()
    try:
        # Create or get conversation
        if conversation_id:
            conversation = fresh_db.query(Conversation).filter(
                Conversation.id == conversation_id,
                Conversation.user_id == user.id
            ).first()
            
            if not conversation:
                # Cannot use HTTP exceptions in streaming response
                async def error_stream():
                    yield json.dumps({"error": "Conversation not found"}).encode('utf-8')
                return StreamingResponse(error_stream(), media_type="text/event-stream")
        else:
            # Create new conversation using the service which adds welcome message
            from .conversation_service import create_conversation
            result = create_conversation(fresh_db, user.id, message_text[:50] if message_text else "New Conversation")
            if not result.get("success", False):
                logger.error(f"Error creating conversation: {result.get('error')}")
                async def error_stream():
                    yield f"data: {json.dumps({'error': 'Failed to create conversation'})}\n\n".encode('utf-8')
                return StreamingResponse(error_stream(), media_type="text/event-stream")
            
            # Use the conversation ID from the result
            conversation_id = result["conversation_id"]
            conversation = fresh_db.query(Conversation).filter(Conversation.id == conversation_id).first()
        
        # Save user message
        message_id = generate_id()
        message = Message(
            id=message_id,
            conversation_id=conversation.id,
            role="user",
            content=message_text
        )
        fresh_db.add(message)
        
        # Update timestamp
        conversation.updated_at = datetime.now()
        fresh_db.commit()
        
        # Create request object with model name (required by Ollama)
        request_body = {
            "messages": [{"role": "user", "content": strip_editor_html(message_text)}],
            "model": settings.default_model,  # Use the model configured in settings
            "stream": True,
            "temperature": settings.temperature,
            "conversation_id": conversation_id,
            "message_id": message_id,
            "system": "You are a helpful AI assistant that answers questions accurately and concisely.",
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
        
        # Set up streaming response
        async def event_stream():
            # CRITICAL FIX: Always use the frontend-provided assistant message ID if available
            # Extract it once and store it consistently throughout the request lifecycle
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
            
            # CRITICAL: Log verification to ensure assistant_message_id remains consistent
            logger.info(f"CRITICAL: Verifying assistant_message_id is set to: {assistant_message_id}")
            
            assistant_content = ""
            
            try:
                # Add request to queue
                await queue_manager.add_request(request_obj)
                
                # Track for WebSocket updates
                manager.track_request(request_obj.timestamp.timestamp(), user.id)
                
                # Extract transport mode first to make decisions
                transport_mode = request_obj.body.get("transport_mode")
                
                # Fallback to header-based detection if transport_mode is not explicitly set
                if not transport_mode:
                    request_headers = request_obj.body.get("headers", {})
                    is_websocket_client = request_headers.get("Connection") == "Upgrade" and "Upgrade" in request_headers
                    transport_mode = "websocket" if is_websocket_client else "sse"
                else:
                    is_websocket_client = transport_mode == "websocket"
                
                logger.info(f"Using transport mode: {transport_mode} for client")
                
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
                async for chunk in queue_manager.process_streaming_request(request_obj):
                    # Log the raw chunk for debugging
                    logger.info(f"Streaming chunk: {chunk[:200]}...")
                    
                    # For SSE clients only - send in SSE format
                    if transport_mode == "sse":
                        yield f"data: {chunk}\n\n".encode('utf-8')
                    
                    # Process and send via WebSocket only for WebSocket clients
                    if transport_mode == "websocket":
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
                            
                            # If we couldn't find a token, use the entire chunk as fallback
                            if not token and isinstance(data, dict):
                                logger.warning(f"Couldn't extract token from data structure: {str(data)[:100]}")
                                token = json.dumps(data)
                            
                            # Accumulate content
                            assistant_content += token
                            
                            # Create a clean WebSocket message with the extracted token
                            # CRITICAL: Always use frontend-provided assistant_message_id consistently
                            # to ensure the frontend can match streaming content to its placeholder message
                            
                            # CRITICAL FIX: We've already extracted and verified the assistant_message_id 
                            # at the beginning of this function, so we should no longer have any mismatches here.
                            # This code is kept but simplified as a final safety check
                            current_assistant_id = request_obj.body.get("assistant_message_id")
                            if assistant_message_id != current_assistant_id and current_assistant_id:
                                logger.error(f"CRITICAL ERROR: ID MISMATCH! Variable assistant_message_id={assistant_message_id} doesn't match request body assistant_message_id={current_assistant_id}")
                                # Use the same ID consistently throughout the entire request
                                logger.warning(f"Correcting ID mismatch - using request body value: {current_assistant_id}")
                                assistant_message_id = current_assistant_id
                            
                            websocket_message = {
                                "type": "message_update",
                                "message_id": assistant_message_id, # Use assistant ID for updates
                                "conversation_id": conversation_id,
                                "status": "STREAMING",
                                "assistant_content": token,
                                "is_complete": is_complete
                            }
                            
                            # Log the message ID to verify consistency
                            if token and token[0] != " ":  # Only log for first token to avoid spam
                                logger.info(f"WebSocket message using message_id: {assistant_message_id}")
                            
                            # For Ollama format, include model info when available
                            if "model" in data:
                                websocket_message["model"] = data["model"]
                            
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
                            logger.info(f"Non-JSON response, treating as raw text: {e}")
                            
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
                
                # Save final message
                db = SessionLocal()
                try:
                    assistant_message = Message(
                        id=assistant_message_id,
                        conversation_id=conversation_id,
                        role="assistant",
                        content=assistant_content
                    )
                    db.add(assistant_message)
                    db.commit()
                    
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
                            "is_complete": True
                        }
                        
                        # Log the final message ID to verify consistency
                        logger.info(f"FINAL WebSocket message using message_id: {assistant_message_id}")
                        
                        logger.info("Sending final completion message to WebSocket clients")
                        await manager.send_update(user.id, final_websocket_message)
                finally:
                    db.close()
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
        
        # Special case for WebSocket clients - return a properly formatted response
        # that matches the expected frontend structure but indicates responses will come via WebSocket
        if request_body.get("transport_mode") == "websocket":
            logger.info("WebSocket client detected - returning compatible HTTP response")
            
            # CRITICAL: Verify we're returning the correct message ID to the frontend
            final_assistant_id = request_obj.body.get("assistant_message_id")
            if final_assistant_id != assistant_message_id:
                logger.warning(f"Final ID MISMATCH! Using {final_assistant_id} from request body instead of {assistant_message_id}")
                assistant_message_id = final_assistant_id
                
            logger.info(f"Returning final HTTP response with message ID: {assistant_message_id}")
            
            # Create a proper message response format that the frontend expects
            response_data = {
                "id": assistant_message_id,  # Use the assistant message ID as the message ID
                "conversation_id": conversation_id,
                "content": "",  # Empty content since actual content will come via WebSocket
                "created_at": datetime.now().isoformat(),
                "role": "assistant",
                "status": "streaming",  # Indicate streaming status
                "websocket_mode": True,  # Custom flag to indicate WebSocket delivery
                "success": True,  # Indicate success to prevent frontend error handling
                "assistant_message_id": assistant_message_id  # Explicitly include assistant ID again for clarity
            }
            
            async def response_stream():
                yield json.dumps(response_data).encode('utf-8')
                
            return StreamingResponse(response_stream(), media_type="application/json")
        
        # Return normal streaming response for SSE clients
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