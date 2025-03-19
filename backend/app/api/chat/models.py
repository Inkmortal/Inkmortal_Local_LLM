"""
Database models for chat conversations and messages.
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

from ...db import Base
from ...auth.models import User

class Conversation(Base):
    """Database model for chat conversations"""
    __tablename__ = "conversations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Context management fields
    conversation_summary = Column(Text, nullable=True)
    last_summarized_message_id = Column(String(36), nullable=True)
    
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
    status = Column(String(50), nullable=True)  # 'streaming', 'complete', 'error'
    model = Column(String(255), nullable=True)  # Store which model was used
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")


# Add relationships to User model if not already present
if not hasattr(User, 'conversations'):
    User.conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")