"""
Pydantic schemas for the chat API.
"""
from pydantic import BaseModel, validator, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


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
        from_attributes = True


class ConversationResponse(BaseModel):
    """Schema for conversation response"""
    id: str
    title: Optional[str] = None
    messages: List[MessageResponse]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


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


class MessageStatusResponse(BaseModel):
    """Schema for message status response"""
    status: str
    queue_position: Optional[int] = None


# New schemas for CreateChatRequest and GetChatResponse
class CreateChatRequest(BaseModel):
    """Schema for creating a new chat conversation"""
    title: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class GetChatResponse(BaseModel):
    """Schema for chat response"""
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    metadata: Optional[Dict[str, Any]] = None