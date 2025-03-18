"""
API routes for chat functionality.

This file contains the endpoint definitions for the chat API.
The complex streaming logic is in stream_message.py.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status, WebSocket, WebSocketDisconnect, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import logging
import json
import time
from jose import JWTError
from datetime import datetime, timedelta

from .schemas import (
    MessageCreate, MessageResponse, ConversationResponse, 
    ConversationCreate, ConversationUpdate
)
from .models import Conversation, Message
from .conversation_service import (
    create_conversation, get_conversation, list_conversations,
    update_conversation, delete_conversation
)
from .utils import get_queue, generate_id, strip_editor_html
from .stream_message import stream_message
from .websocket import manager

from ...db import get_db, SessionLocal
from ...auth.utils import get_current_user, get_current_admin_user, jwt, SECRET_KEY, ALGORITHM
from ...auth.models import User
from ...queue import QueuedRequest, RequestPriority

# Set up logger
logger = logging.getLogger("app.api.chat.router_endpoints")

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
    client_info = f"{websocket.client.host}:{websocket.client.port}"
    logger.info(f"WebSocket connection attempt from {client_info}")
    
    if not token:
        logger.warning(f"WebSocket connection rejected - missing token from {client_info}")
        await websocket.close(code=1008, reason="Missing authentication token")
        return
    
    try:
        try:
            # Decode JWT token
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if not username:
                logger.warning(f"WebSocket connection rejected - token missing 'sub' claim from {client_info}")
                await websocket.close(code=1008, reason="Invalid token")
                return
            
            # Get user from database
            user = db.query(User).filter(User.username == username).first()
            if not user:
                logger.warning(f"WebSocket connection rejected - user '{username}' not found in database from {client_info}")
                await websocket.close(code=1008, reason="User not found")
                return
                
            logger.info(f"WebSocket authentication successful for user {username} (ID: {user.id}) from {client_info}")
            
            # Establish connection
            await manager.connect(websocket, user.id)
            
            try:
                # Keep connection alive and handle messages
                while True:
                    # Wait for any message from client
                    data = await websocket.receive_text()
                    logger.info(f"[READINESS-DEBUG] WebSocket message received: length={len(data)}, first20={data[:20]}")
                    
                    # Try to parse as JSON for command messages
                    try:
                        # Log raw data for debugging complex problems
                        logger.info(f"[READINESS-DEBUG] RAW WS message received: data={data[:100]}...")
                        
                        message = json.loads(data)
                        message_type = message.get("type")
                        logger.info(f"[READINESS-DEBUG] Parsed message type: {message_type}")
                        
                        # Handle client_ready signals - critical for streaming sync
                        if message_type == "client_ready":
                            # Event-based logging - client_ready received
                            logger.info(f"[READINESS-EVENT] CLIENT_READY_RECEIVED user={user.id}")
                            
                            # Extract IDs from the message
                            message_id = message.get("message_id")
                            conversation_id = message.get("conversation_id")
                            
                            # Log detailed message info
                            logger.info(f"[READINESS-DEBUG] Received client_ready signal: msgId={message_id[:8] if message_id else 'None'}, convId={conversation_id[:8] if conversation_id else 'None'}, userId={user.id}")
                            
                            # Validate IDs
                            if not message_id or not conversation_id:
                                logger.error(f"[READINESS-EVENT] CLIENT_READY_INVALID_IDS user={user.id} message_id={message_id} conversation_id={conversation_id}")
                                # Send error response
                                await websocket.send_json({
                                    "type": "readiness_error",
                                    "error": "Invalid message_id or conversation_id",
                                    "timestamp": time.time()
                                })
                                continue
                                
                            try:
                                # Store this readiness state in the connection manager
                                # This will tell the stream_message function to begin streaming
                                logger.info(f"[READINESS-EVENT] MARKING_CLIENT_READY user={user.id} msgId={message_id[:8]} convId={conversation_id[:8]}")
                                ready_result = await manager.mark_client_ready(message_id, conversation_id, user.id)
                                logger.info(f"[READINESS-EVENT] CLIENT_READY_MARKED user={user.id} result={ready_result}")
                                
                                # Send confirmation back to client
                                conf_msg = {
                                    "type": "readiness_confirmed",
                                    "message_id": message_id,
                                    "conversation_id": conversation_id,
                                    "readiness_confirmed": True,
                                    "timestamp": time.time()
                                }
                                logger.info(f"[READINESS-EVENT] SENDING_CONFIRMATION user={user.id} msgId={message_id[:8]}")
                                await websocket.send_json(conf_msg)
                                logger.info(f"[READINESS-EVENT] CONFIRMATION_SENT user={user.id} msgId={message_id[:8]}")
                                continue
                            except Exception as ready_error:
                                # Specific exception handling for readiness protocol
                                error_type = type(ready_error).__name__
                                logger.error(f"[READINESS-EVENT] READINESS_PROTOCOL_ERROR user={user.id} error_type={error_type} error={str(ready_error)}")
                                # Try to send error to client
                                try:
                                    await websocket.send_json({
                                        "type": "readiness_error",
                                        "error": f"Server error: {error_type}",
                                        "timestamp": time.time()
                                    })
                                except:
                                    logger.error(f"[READINESS-EVENT] FAILED_TO_SEND_ERROR user={user.id}")
                                continue
                        
                        # For other message types or heartbeats, just acknowledge
                        await websocket.send_json({"type": "ack"})
                    except json.JSONDecodeError:
                        # Not JSON, treat as heartbeat
                        await websocket.send_json({"type": "ack"})
            except WebSocketDisconnect:
                # Handle disconnection
                manager.disconnect(websocket, user.id)
            
        except JWTError:
            # Handle invalid token
            await websocket.close(code=1008, reason="Invalid token")
            
    except Exception as e:
        # Enhanced error logging with error type and traceback
        import traceback
        error_type = type(e).__name__
        logger.error(f"WebSocket error [{error_type}]: {str(e)}")
        logger.error(f"WebSocket error traceback:\n{traceback.format_exc()}")
        
        # Log client info for correlation with connection attempts
        client_info = f"{websocket.client.host}:{websocket.client.port}" if hasattr(websocket, 'client') else "unknown"
        logger.error(f"WebSocket connection failed for client {client_info}")
        
        try:
            await websocket.close(code=1011, reason="Server error")
        except Exception as close_error:
            logger.error(f"Error while closing WebSocket: {str(close_error)}")


# Endpoint to create a new conversation
@router.post("/conversation", status_code=status.HTTP_201_CREATED)
async def create_conversation_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new conversation with two-phase support
    
    Supports a 'prepare_only' flag for the first phase of two-phase messaging:
    - Phase 1: Create conversation but don't queue LLM request
    - Phase 2: Process message with established conversation ID
    """
    # Parse body - can be ConversationCreate or have prepare_only flag
    body = await request.json()
    
    # Extract data from request
    title = body.get('title', None)
    prepare_only = body.get('prepare_only', False)
    message = body.get('message', None)
    
    # Log extended information about the request
    logger.info(f"Creating conversation with prepare_only={prepare_only}, title={title}")
    
    # Create conversation
    result = create_conversation(db, current_user.id, title=title or message)
    
    if not result.get("success", False):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Error creating conversation")
        )
    
    # Generate a session token for phase 2 authentication
    # This helps ensure only the client that created the conversation can use it
    session_token = jwt.encode(
        {
            "sub": current_user.username, 
            "conversation_id": result["conversation_id"],
            "exp": datetime.utcnow() + timedelta(minutes=10)
        }, 
        SECRET_KEY, 
        algorithm=ALGORITHM
    )
    
    # Return response with conversation details and session token
    return {
        "conversation_id": result["conversation_id"],
        "title": result.get("title", "New conversation"),
        "session_token": session_token,
        "prepare_only": prepare_only
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
    
    # Added debug logging to help diagnose history issues
    logger.info(f"Fetched {len(conversations)} conversations for user {current_user.username}")
    if conversations:
        logger.info(f"First conversation: {conversations[0].get('id')} - {conversations[0].get('title')}")
    
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

# Endpoint to get available models (accessible to all users)
@router.get("/models")
async def get_available_models(
    current_user: User = Depends(get_current_user)
):
    """Get a list of available models for regular users"""
    try:
        import requests
        from ...config import settings
        
        # Try to get available models from Ollama API
        response = requests.get(f"{settings.ollama_api_url}/api/tags")
        
        if response.status_code == 200:
            models_data = response.json()
            
            # Format the response for frontend
            models = [
                {
                    "id": model["name"],
                    "name": model["name"],
                    "size": model.get("size", 0),
                    "modified_at": model.get("modified_at", "")
                }
                for model in models_data.get("models", [])
            ]
            
            # If no models found from Ollama, use the default model
            if not models:
                models = [{"id": settings.default_model, "name": settings.default_model}]
            
            return {"models": models, "default_model": settings.default_model}
        else:
            # If Ollama request fails, return just the default model
            return {
                "models": [{"id": settings.default_model, "name": settings.default_model}],
                "default_model": settings.default_model
            }
    except Exception as e:
        logger.error(f"Error fetching models: {str(e)}")
        # Return just the default model as fallback
        return {
            "models": [{"id": settings.default_model, "name": settings.default_model}],
            "default_model": settings.default_model
        }

# Endpoint to send a message with file upload - supports two-phase communication
@router.post("/message")
async def send_message_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    queue_manager = Depends(get_queue)
):
    """Send a message to the LLM and store the conversation using two-phase messaging
    
    Phase 1: Conversation creation (done separately via /conversation endpoint)
    Phase 2: This endpoint - processes message with established conversation ID
    
    IMPORTANT:
    - Requires a valid conversation_id
    - Requires a frontend-generated assistant_message_id for consistent WebSocket updates
    - Session_token may be provided for extra security
    """
    logger.info(f"ROUTER ENDPOINT: send_message_endpoint called by user {current_user.username}")
    
    content_type = request.headers.get("Content-Type", "")
    message_text = None
    conversation_id = None
    session_token = None
    assistant_message_id = None
    headers = {}
    file_content = None
    
    try:
        # Parse request based on content type
        if "multipart/form-data" in content_type:
            # Handle form data with potential file upload
            form = await request.form()
            message_text = form.get("message")
            conversation_id = form.get("conversation_id")
            session_token = form.get("session_token")
            assistant_message_id = form.get("assistant_message_id")
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
            session_token = data.get("session_token")
            assistant_message_id = data.get("assistant_message_id")
            headers = data.get("headers", {})
        
        # Validate message text
        if not message_text:
            logger.error("Message content missing in request")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message is required"
            )
        
        # Validate conversation ID - REQUIRED in two-phase approach
        if not conversation_id:
            logger.error("Conversation ID missing in request")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Conversation ID is required - use two-phase messaging"
            )
        
        # Validate assistant message ID - REQUIRED for consistent WebSocket updates
        if not assistant_message_id:
            logger.error("Assistant message ID missing in request")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assistant message ID is required for consistent updates"
            )
        
        # Validate session token if provided (optional validation)
        if session_token:
            try:
                # Decode the token
                payload = jwt.decode(session_token, SECRET_KEY, algorithms=[ALGORITHM])
                token_conversation_id = payload.get("conversation_id")
                token_username = payload.get("sub")
                
                # Verify the token matches this conversation and user
                if token_conversation_id != conversation_id or token_username != current_user.username:
                    logger.warning(f"Invalid session token for conversation {conversation_id}")
                    # Continue anyway but log it
            except JWTError:
                logger.warning(f"Invalid session token format for conversation {conversation_id}")
                # Continue anyway but log it
        else:
            # No session token provided, that's OK - it's optional for backward compatibility
            logger.info(f"No session token provided for conversation {conversation_id} - continuing anyway")
        
        # Log the request details
        logger.info(f"Processing message: conversation_id={conversation_id}, assistant_message_id={assistant_message_id}")
        
        # Process the message with streaming
        response = await stream_message(
            db=db,
            user=current_user,
            message_text=message_text,
            conversation_id=conversation_id,  # Now guaranteed to be present
            file_content=file_content,
            queue_manager=queue_manager,
            assistant_message_id=assistant_message_id,
            headers=headers
        )
        
        return response
        
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