"""
API routes for chat functionality.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status, File, UploadFile, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import logging
import asyncio
import json
from jose import JWTError

from .schemas import (
    MessageCreate, MessageResponse, ConversationResponse, 
    ConversationCreate, ConversationUpdate
)
from .models import Conversation, Message
from .message_service import send_message, get_message_status
from .conversation_service import (
    create_conversation, get_conversation, list_conversations,
    update_conversation, delete_conversation
)
from .utils import get_queue, generate_id, strip_editor_html
from ...config import settings
from .websocket import manager

from ...db import get_db, SessionLocal
from ...auth.utils import get_current_user, get_current_admin_user, jwt, SECRET_KEY, ALGORITHM
from ...auth.models import User
from ...queue import QueuedRequest, RequestPriority
from datetime import datetime

# Set up logger
logger = logging.getLogger("app.api.chat.router")

# Create router
router = APIRouter(prefix="/api/chat", tags=["chat"])

# WebSocket connection endpoint
@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = None,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time message updates"""
    # Extract token from query parameters
    if not token:
        await websocket.close(code=1008, reason="Missing authentication token")
        return
    
    try:
        try:
            # Decode JWT token
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if not username:
                await websocket.close(code=1008, reason="Invalid token")
                return
            
            # Get user from database
            user = db.query(User).filter(User.username == username).first()
            if not user:
                await websocket.close(code=1008, reason="User not found")
                return
            
            # Establish connection
            await manager.connect(websocket, user.id)
            
            try:
                # Keep connection alive and handle messages
                while True:
                    # Wait for any message from client (heartbeat)
                    data = await websocket.receive_text()
                    # Echo back a simple acknowledgment
                    await websocket.send_json({"type": "ack"})
            except WebSocketDisconnect:
                # Handle disconnection
                manager.disconnect(websocket, user.id)
            
        except JWTError:
            # Handle invalid token
            await websocket.close(code=1008, reason="Invalid token")
            
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        try:
            await websocket.close(code=1011, reason="Server error")
        except:
            pass

# Endpoint to check message status
@router.get("/message/{message_id}/status")
async def get_message_status_endpoint(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    queue_manager = Depends(get_queue)
):
    """Get the current status of a message"""
    result = await get_message_status(db, message_id, current_user.id, queue_manager)
    
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
        
    return result

# Endpoint to create a new conversation
@router.post("/conversation", status_code=status.HTTP_201_CREATED)
async def create_conversation_endpoint(
    conversation: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new conversation"""
    result = create_conversation(db, current_user.id, title=conversation.title)
    
    if not result.get("success", False):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Error creating conversation")
        )
    
    return {
        "conversation_id": result["conversation_id"],
        "title": result.get("title", "New conversation")
    }

# Endpoint to get a conversation
@router.get("/conversation/{conversation_id}")
async def get_conversation_endpoint(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a conversation with its messages"""
    result = get_conversation(db, conversation_id, current_user.id)
    
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return result

# Endpoint to list user conversations
@router.get("/conversations")
async def list_conversations_endpoint(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List conversations for a user"""
    conversations = list_conversations(db, current_user.id, limit, offset)
    return {"conversations": conversations}

# Endpoint to update a conversation
@router.put("/conversation/{conversation_id}")
async def update_conversation_endpoint(
    conversation_id: str,
    conversation_update: ConversationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a conversation"""
    result = update_conversation(db, conversation_id, current_user.id, conversation_update.title)
    
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return result

# Endpoint to delete a conversation
@router.delete("/conversation/{conversation_id}")
async def delete_conversation_endpoint(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a conversation"""
    result = delete_conversation(db, conversation_id, current_user.id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return {"success": True}

# Endpoint to send a message with file upload
@router.post("/message")
async def send_message_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    queue_manager = Depends(get_queue)
):
    """Send a message to the LLM and store the conversation"""
    content_type = request.headers.get("Content-Type", "")
    message_text = None
    conversation_id = None
    file_content = None
    stream = False
    
    try:
        # Parse request based on content type
        if "multipart/form-data" in content_type:
            # Handle form data with potential file upload
            form = await request.form()
            message_text = form.get("message")
            conversation_id = form.get("conversation_id")
            stream_param = form.get("stream")
            if stream_param and stream_param.lower() in ("true", "1", "yes"):
                stream = True
            file = form.get("file")
            
            # Handle file upload if provided
            if file and isinstance(file, UploadFile):
                # Process file
                file_data = await file.read()
                file_content = {
                    "filename": file.filename,
                    "size": len(file_data),
                    "content_type": file.content_type
                }
        else:
            # Handle JSON request
            data = await request.json()
            message_text = data.get("message")
            conversation_id = data.get("conversation_id")
            stream = data.get("stream", False)
            
        # Validate message text
        if not message_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message is required"
            )
        
        # Check if streaming is requested
        if stream:
            # Send message with streaming
            return await stream_message(
                db=db,
                user=current_user,
                message_text=message_text,
                conversation_id=conversation_id,
                file_content=file_content,
                queue_manager=queue_manager
            )
            
        # Send message using service (non-streaming)
        result = await send_message(
            db=db,
            user=current_user,
            message_text=message_text,
            conversation_id=conversation_id,
            file_content=file_content,
            queue_manager=queue_manager
        )
        
        if not result.get("success", False):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Error processing message")
            )
        
        return {
            "message_id": result["message_id"],
            "conversation_id": result["conversation_id"]
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"Unexpected error in send_message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing message: {str(e)}"
        )

# Streaming message handler
async def stream_message(
    db: Session,
    user: User,
    message_text: str,
    conversation_id: Optional[str] = None,
    file_content: Optional[Dict[str, Any]] = None,
    queue_manager = None
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
        request_obj = QueuedRequest(
            priority=RequestPriority.WEB_INTERFACE,
            endpoint="/api/chat/completions",
            body={
                "messages": [{"role": "user", "content": strip_editor_html(message_text)}],
                "model": settings.default_model,  # Use the model configured in settings
                "stream": True,
                "temperature": settings.temperature,
                "conversation_id": conversation_id,
                "message_id": message_id,
                "system": "You are a helpful AI assistant that answers questions accurately and concisely.",
                # Include tools if enabled in settings
                **({"tools": []} if settings.tool_calling_enabled else {})
            },
            user_id=user.id
        )
        
        # Set up streaming response
        async def event_stream():
            assistant_message_id = generate_id()
            assistant_content = ""
            
            try:
                # Add request to queue
                await queue_manager.add_request(request_obj)
                
                # Track for WebSocket updates
                manager.track_request(request_obj.timestamp.timestamp(), user.id)
                
                # First update for WebSocket clients
                await manager.send_update(user.id, {
                    "type": "message_update",
                    "message_id": message_id,
                    "conversation_id": conversation_id,
                    "status": "STREAMING",
                    "assistant_content": ""
                })
                
                # Stream from Ollama via queue manager
                async for chunk in queue_manager.process_streaming_request(request_obj):
                    # Log the raw chunk for debugging
                    logger.info(f"Streaming chunk: {chunk[:200]}...")
                    
                    # First yield to HTTP client
                    yield f"data: {chunk}\n\n".encode('utf-8')
                    
                    # Try to parse for WebSocket
                    try:
                        # First try to parse as JSON
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
                        
                        # Send to WebSocket clients
                        await manager.send_update(user.id, {
                            "type": "message_update",
                            "message_id": message_id,
                            "conversation_id": conversation_id,
                            "status": "STREAMING",
                            "assistant_content": token,
                            "is_complete": is_complete
                        })
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
                        
                        # Send to WebSocket clients
                        await manager.send_update(user.id, {
                            "type": "message_update",
                            "message_id": message_id,
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
                    
                    # Final update
                    await manager.send_update(user.id, {
                        "type": "message_update",
                        "message_id": message_id,
                        "conversation_id": conversation_id,
                        "status": "COMPLETE",
                        "assistant_message_id": assistant_message_id,
                        "assistant_content": assistant_content,
                        "is_complete": True
                    })
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n".encode('utf-8')
                
                # Error through WebSocket
                await manager.send_update(user.id, {
                    "type": "message_update",
                    "message_id": message_id,
                    "conversation_id": conversation_id,
                    "status": "ERROR",
                    "error": str(e)
                })
            finally:
                # Clean up
                manager.untrack_request(request_obj.timestamp.timestamp())
        
        # Return streaming response
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
