"""
Conversation management service layer for chat functionality.
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text

from .models import Conversation, Message
from .utils import generate_id

# Set up logger
logger = logging.getLogger("app.api.chat.conversation_service")

def create_conversation(
    db: Session,
    user_id: int,
    title: Optional[str] = None
) -> Dict[str, Any]:
    """Create a new conversation with improved transaction handling"""
    # Generate a new UUID for conversation ID
    conversation_id = generate_id()
    
    try:
        # Use basic transaction approach without isolation level changes
        transaction = db.begin_nested()
        
        try:
            # Check for recent conversations to avoid duplicates
            recent_time = datetime.now() - timedelta(seconds=5)
            recent_conversation = db.query(Conversation).filter(
                Conversation.user_id == user_id,
                Conversation.created_at > recent_time
            ).first()
            
            if recent_conversation:
                # Return existing conversation instead of creating new one
                transaction.rollback()
                logger.info(f"Using recent conversation {recent_conversation.id} instead of creating new one")
                return {
                    "success": True,
                    "conversation_id": recent_conversation.id,
                    "title": recent_conversation.title
                }
            
            # Create conversation with explicit ID
            conversation = Conversation(
                id=conversation_id,
                user_id=user_id,
                title=title or "New conversation"
            )
            
            # Add to database
            db.add(conversation)
            db.flush()
            
            # Create welcome message
            welcome_message = Message(
                id=generate_id(),
                conversation_id=conversation_id,
                role="assistant",
                content="Hello! I'm your educational AI assistant. I can help with math problems, coding questions, and explain concepts from textbooks. How can I help you today?"
            )
            
            # Add to database
            db.add(welcome_message)
            
            # Commit transaction
            transaction.commit()
            db.commit()
            
            logger.info(f"Created new conversation {conversation_id} for user {user_id}")
            return {
                "success": True,
                "conversation_id": conversation_id,
                "title": title or "New conversation"
            }
            
        except Exception as inner_e:
            # Rollback transaction
            transaction.rollback()
            db.rollback()
            logger.error(f"Error creating conversation: {str(inner_e)}")
            
            return {
                "success": False,
                "error": str(inner_e)
            }
            
    except Exception as e:
        # Handle outer transaction errors
        logger.error(f"Transaction error creating conversation: {str(e)}")
        try:
            db.rollback()
        except:
            pass
            
        return {
            "success": False,
            "error": f"Database error: {str(e)}"
        }

def get_conversation(
    db: Session,
    conversation_id: str,
    user_id: int
) -> Optional[Dict[str, Any]]:
    """Get a conversation with its messages for a user"""
    # Find conversation
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == user_id
    ).first()
    
    if not conversation:
        return None
    
    # Get messages for this conversation
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at).all()
    
    # Convert to response format with enhanced fields for frontend
    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "messages": [
            {
                "id": message.id,
                "conversation_id": message.conversation_id,  # Add conversation_id explicitly
                "role": message.role,
                "content": message.content,
                "created_at": message.created_at,
                "status": message.status or "complete",  # Add status field with default
                "model": message.model,  # Include model info if available
            }
            for message in messages
        ]
    }

def list_conversations(
    db: Session,
    user_id: int,
    limit: int = 20,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """Get a list of conversations for a user"""
    # Find conversations for this user
    conversations = db.query(Conversation).filter(
        Conversation.user_id == user_id
    ).order_by(Conversation.updated_at.desc()).offset(offset).limit(limit).all()
    
    # Convert to response format
    return [
        {
            "id": conv.id,
            "title": conv.title,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at
        }
        for conv in conversations
    ]

def update_conversation(
    db: Session,
    conversation_id: str,
    user_id: int,
    title: Optional[str]
) -> Optional[Dict[str, Any]]:
    """Update conversation details"""
    # Find conversation
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == user_id
    ).first()
    
    if not conversation:
        return None
    
    # Update title if provided
    if title is not None:
        conversation.title = title
    
    # Save changes
    db.commit()
    
    # Return updated conversation
    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at
    }

def delete_conversation(
    db: Session,
    conversation_id: str,
    user_id: int
) -> bool:
    """Delete a conversation and all its messages"""
    # Find conversation
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == user_id
    ).first()
    
    if not conversation:
        return False
    
    try:
        # Delete conversation (will cascade to messages)
        db.delete(conversation)
        db.commit()
        
        logger.info(f"Deleted conversation {conversation_id} for user {user_id}")
        return True
        
    except Exception as e:
        # Handle errors
        db.rollback()
        logger.error(f"Error deleting conversation {conversation_id}: {str(e)}")
        return False