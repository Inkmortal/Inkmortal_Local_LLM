"""
API for chat conversations management and integration with LLM service.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func, exc as sqlalchemy_exc
from sqlalchemy.orm import Session, relationship
from pydantic import BaseModel, validator, Field
from typing import Dict, Any, List, Optional
import httpx
import json
import os
import asyncio
import uuid
import logging
from datetime import datetime

from ..db import get_db, Base
from ..auth.utils import get_current_user, validate_api_key, get_current_admin_user
from ..auth.models import User
from ..queue import QueuedRequest, RequestPriority, get_queue_manager, QueueManagerInterface
from ..config import settings

# Set up logger
logger = logging.getLogger("app.api.chat")

# Database models for conversations and messages
class Conversation(Base):
    """Database model for chat conversations"""
    __tablename__ = "conversations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    """Database model for chat messages"""
    __tablename__ = "messages"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False)
    role = Column(String(50), nullable=False)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")


# Add relationships to User model
User.conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")


# Pydantic models for API
class MessageCreate(BaseModel):
    """Schema for creating a new message"""
    message: str
    conversation_id: Optional[str] = None
    

class MessageResponse(BaseModel):
    """Schema for message response"""
    id: str
    conversation_id: str
    content: str
    role: str
    created_at: datetime
    
    class Config:
        orm_mode = True
        

class ConversationResponse(BaseModel):
    """Schema for conversation response"""
    conversation_id: str
    title: Optional[str] = None
    messages: List[MessageResponse]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True
        

class ConversationCreate(BaseModel):
    """Schema for creating a new conversation"""
    title: Optional[str] = Field(None, max_length=255)
    
    @validator('title')
    def validate_title(cls, v):
        if v is not None and len(v.strip()) == 0:
            return None
        return v
    

class ConversationUpdate(BaseModel):
    """Schema for updating a conversation"""
    title: Optional[str] = Field(None, max_length=255)
    
    @validator('title')
    def validate_title(cls, v):
        if v is not None and len(v.strip()) == 0:
            return None
        return v


# Create router
router = APIRouter(prefix="/api/chat", tags=["chat"])


# Create a FastAPI dependency for the queue manager
async def get_queue() -> QueueManagerInterface:
    """Get the queue manager instance"""
    queue_manager = get_queue_manager()
    # Ensure the manager is connected if not in test mode
    if not settings.is_testing:
        await queue_manager.ensure_connected()
    return queue_manager


@router.post("/conversation", response_model=Dict[str, str])
async def create_conversation(
    conversation: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new conversation with proper transaction handling and error management"""
    # Generate a new UUID for conversation ID
    conversation_id = str(uuid.uuid4())
    
    # Start a new transaction
    try:
        # Begin transaction explicitly
        transaction = db.begin_nested()
        
        # Create conversation with explicit ID (avoids race conditions)
        new_conversation = Conversation(
            id=conversation_id,
            user_id=current_user.id,
            title=conversation.title or "New conversation"
        )
        
        # Add conversation to database
        db.add(new_conversation)
        
        # Flush to ensure ID is available (but not committed yet)
        db.flush()
        
        # Create welcome message with explicit conversation ID reference
        welcome_message = Message(
            id=str(uuid.uuid4()),  # Explicit ID for message
            conversation_id=conversation_id,  # Use the explicit ID
            role="assistant",
            content="Hello! I'm your educational AI assistant. I can help with math problems, coding questions, and explain concepts from textbooks. How can I help you today?"
        )
        
        # Add welcome message to database
        db.add(welcome_message)
        
        # Commit transaction
        transaction.commit()
        db.commit()
        
        # Log successful creation
        logger.info(f"Created conversation {conversation_id} for user {current_user.id}")
        
        return {"conversation_id": conversation_id}
        
    except sqlalchemy_exc.SQLAlchemyError as db_error:
        # Handle database-specific errors
        db.rollback()
        error_message = f"Database error creating conversation: {str(db_error)}"
        logger.error(error_message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_message
        )
    except Exception as e:
        # Handle any other unexpected errors
        db.rollback()
        error_message = f"Error creating conversation: {str(e)}"
        logger.error(error_message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_message
        )


@router.get("/conversation/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get conversation by ID"""
    try:
        # Query conversation with messages
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Get messages
        messages = db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at).all()
        
        # Return conversation with messages
        return ConversationResponse(
            conversation_id=conversation.id,
            title=conversation.title,
            messages=[
                MessageResponse(
                    id=msg.id,
                    conversation_id=msg.conversation_id,
                    content=msg.content,
                    role=msg.role,
                    created_at=msg.created_at
                ) for msg in messages
            ],
            created_at=conversation.created_at,
            updated_at=conversation.updated_at
        )
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log and convert other exceptions to HTTP exceptions
        logger.error(f"Error retrieving conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving conversation: {str(e)}"
        )


@router.get("/conversations", response_model=List[Dict[str, Any]])
async def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all conversations for the current user"""
    try:
        conversations = db.query(Conversation).filter(
            Conversation.user_id == current_user.id
        ).order_by(Conversation.updated_at.desc()).all()
        
        return [
            {
                "conversation_id": conv.id,
                "title": conv.title,
                "created_at": conv.created_at,
                "updated_at": conv.updated_at
            } for conv in conversations
        ]
    except Exception as e:
        logger.error(f"Error listing conversations for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing conversations: {str(e)}"
        )


@router.delete("/conversation/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a conversation"""
    try:
        # Query conversation
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Delete conversation (messages will be deleted by cascade)
        db.delete(conversation)
        db.commit()
        
        logger.info(f"Deleted conversation {conversation_id} for user {current_user.id}")
        return {"message": "Conversation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting conversation: {str(e)}"
        )


@router.patch("/conversation/{conversation_id}")
async def update_conversation(
    conversation_id: str,
    conversation_update: ConversationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a conversation (currently only title can be updated)"""
    try:
        # Query conversation
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Update title if provided
        if conversation_update.title is not None:
            conversation.title = conversation_update.title
        
        # Update timestamp
        conversation.updated_at = func.now()
        db.commit()
        
        logger.info(f"Updated conversation {conversation_id} for user {current_user.id}")
        return {"message": "Conversation updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating conversation: {str(e)}"
        )


@router.post("/message", response_model=MessageResponse)
async def send_message(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    queue_manager: QueueManagerInterface = Depends(get_queue)
):
    """Send a message to the LLM and store the conversation"""
    content_type = request.headers.get("Content-Type", "")
    message_text = None
    conversation_id = None
    file = None
    
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
                file_content = await file.read()
                message_text = f"{message_text}\n\n[Uploaded file: {file.filename}, size: {len(file_content)} bytes]"
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
        
        # Begin database transaction
        transaction = db.begin_nested()
        
        # Create or get conversation
        if conversation_id:
            conversation = db.query(Conversation).filter(
                Conversation.id == conversation_id,
                Conversation.user_id == current_user.id
            ).first()
            
            if not conversation:
                transaction.rollback()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found"
                )
        else:
            # Create new conversation with explicit ID
            new_conversation_id = str(uuid.uuid4())
            conversation = Conversation(
                id=new_conversation_id,
                user_id=current_user.id,
                title=message_text[:50] + "..." if len(message_text) > 50 else message_text
            )
            db.add(conversation)
            db.flush()
            
        # Create message ID
        message_id = str(uuid.uuid4())
        
        # Save user message to database
        user_message = Message(
            id=message_id,
            conversation_id=conversation.id,
            role="user",
            content=message_text
        )
        db.add(user_message)
        db.flush()
        
        # Commit the transaction for saving the message
        transaction.commit()
        
        # Prepare request to LLM
        chat_body = {
            "model": settings.default_model,
            "messages": [
                {"role": "system", "content": "You are a helpful, creative, and versatile AI assistant. You can discuss any topic, answer questions, generate content, help with tasks, and provide thoughtful insights. Be concise, accurate, and respectful."},
            ]
        }
        
        # Get all previous messages in conversation for context
        prev_messages = db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at.desc()).limit(100).all()
        
        # Add previous messages in chronological order
        for msg in reversed(prev_messages):
            chat_body["messages"].append({"role": msg.role, "content": msg.content})
        
        # Create request object for queue
        request_obj = QueuedRequest(
            priority=RequestPriority.WEB_INTERFACE,
            endpoint="/api/chat/completions",
            body=chat_body,
            user_id=current_user.id,
            auth_type="jwt"
        )
        
        # Add request to queue
        try:
            position = await queue_manager.add_request(request_obj)
            logger.info(f"Added request to queue at position {position}")
        except Exception as e:
            logger.error(f"Failed to add request to queue: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to add request to queue: {str(e)}"
            )
        
        # Wait for response from LLM with timeout
        timeout_seconds = 60.0  # 1 minute timeout
        start_time = asyncio.get_event_loop().time()
        llm_response = None
        
        # Poll for response
        while asyncio.get_event_loop().time() - start_time < timeout_seconds:
            current_request = await queue_manager.get_current_request()
            if not current_request:
                next_request = await queue_manager.get_next_request()
                if next_request and next_request.timestamp == request_obj.timestamp:
                    llm_response = await queue_manager.process_request(next_request)
                    break
            await asyncio.sleep(0.1)
        
        # Handle timeout
        if not llm_response:
            # Start a new transaction for the error message
            error_transaction = db.begin_nested()
            
            # Save error message
            error_message = Message(
                id=str(uuid.uuid4()),
                conversation_id=conversation.id,
                role="system",
                content="Sorry, the request timed out. Please try again later."
            )
            db.add(error_message)
            
            # Commit the error message
            error_transaction.commit()
            db.commit()
            
            logger.warning(f"Request timed out for conversation {conversation.id}")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Request timed out waiting for LLM response"
            )
        
        # Extract assistant's message from LLM response
        try:
            assistant_content = llm_response["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            logger.error(f"Error parsing LLM response: {str(e)}")
            assistant_content = "Sorry, I received an unexpected response format. Please try again."
        
        # Start a new transaction for the assistant message
        assistant_transaction = db.begin_nested()
        
        # Save assistant message to database with explicit ID
        assistant_message_id = str(uuid.uuid4())
        assistant_message = Message(
            id=assistant_message_id,
            conversation_id=conversation.id,
            role="assistant",
            content=assistant_content
        )
        db.add(assistant_message)
        
        # Update conversation timestamp
        conversation.updated_at = func.now()
        
        # Commit the assistant message transaction
        assistant_transaction.commit()
        db.commit()
        
        logger.info(f"Processed message for conversation {conversation.id}")
        
        # Return the response
        return MessageResponse(
            id=assistant_message.id,
            conversation_id=conversation.id,
            content=assistant_content,
            role="assistant",
            created_at=assistant_message.created_at
        )
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Handle any other unexpected errors
        db.rollback()
        logger.error(f"Unexpected error in send_message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing message: {str(e)}"
        )