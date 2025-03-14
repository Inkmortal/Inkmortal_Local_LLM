"""
API routes for chat functionality.

This file contains the endpoint definitions for the chat API.
The complex streaming logic is in stream_message.py.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import logging
import json
from jose import JWTError

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

# Endpoint to send a message with file upload
@router.post("/message")
async def send_message_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    queue_manager = Depends(get_queue)
):
    print("ROUTER ENDPOINT: send_message_endpoint called!")
    """Send a message to the LLM and store the conversation - always uses streaming now
    
    IMPORTANT:
    - The frontend sends an assistant_message_id with each request
    - This ID MUST be preserved and used for all WebSocket updates
    - Failure to use the same ID will break streaming response display
    """
    content_type = request.headers.get("Content-Type", "")
    message_text = None
    conversation_id = None
    file_content = None
    # Always stream - removed stream flag
    
    try:
        # Parse request based on content type
        if "multipart/form-data" in content_type:
            # Handle form data with potential file upload
            form = await request.form()
            message_text = form.get("message")
            conversation_id = form.get("conversation_id")
            # Ignoring stream parameter - always stream now
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
            assistant_message_id = data.get("assistant_message_id")  # Extract assistant message ID
            headers = data.get("headers", {})  # Extract headers for client type detection
            # Ignoring stream parameter - always stream now
            
        # Validate message text
        if not message_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message is required"
            )
        
        # Always use streaming now - no more condition check
        # Using the synchronous queue_manager dependency (no need to await)
        print("ROUTER ENDPOINT: About to call stream_message!")
        print(f"ROUTER ENDPOINT: message_text={message_text[:20]}..., conversation_id={conversation_id}, assistant_message_id={assistant_message_id}")
        return await stream_message(
            db=db,
            user=current_user,
            message_text=message_text,
            conversation_id=conversation_id,
            file_content=file_content,
            queue_manager=queue_manager,
            assistant_message_id=assistant_message_id,  # Pass the assistant message ID
            headers=headers  # Pass headers for client type detection
        )
        
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