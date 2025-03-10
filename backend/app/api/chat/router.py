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
from .utils import get_queue
from .websocket import manager

from ...db import get_db
from ...auth.utils import get_current_user, get_current_admin_user, jwt, SECRET_KEY, ALGORITHM
from ...auth.models import User
from ...queue import QueuedRequest, RequestPriority

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
    
    try:
        # Parse request based on content type
        if "multipart/form-data" in content_type:
            # Handle form data with potential file upload
            form = await request.form()
            message_text = form.get("message")
            conversation_id = form.get("conversation_id")
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
            
        # Validate message text
        if not message_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message is required"
            )
        
        # Send message using service
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