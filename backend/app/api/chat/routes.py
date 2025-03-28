from fastapi import APIRouter, Depends, HTTPException, status, Request, Header, Response, WebSocket, Body
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
import json

from ...db import get_db
from ...models import User
from ...auth import get_current_active_user
from .models import Conversation, Message
from .utils import get_queue
from .stream_message import stream_message
from .tag_processor import TagProcessor

# ... other imports and code ...

@router.post("/messages/{message_id}/process_sections")
async def process_message_sections(
    message_id: str, 
    db: Session = Depends(get_db), 
    user: User = Depends(get_current_active_user)
):
    """
    Process an existing message to extract thinking and response sections.
    Used when loading old conversations with thinking content.
    """
    # Get the message from the database
    message = db.query(Message).filter(Message.id == message_id).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Verify user has access to this message
    conversation = db.query(Conversation).filter(
        Conversation.id == message.conversation_id,
        Conversation.user_id == user.id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this message"
        )
    
    # Process the message content
    sections = TagProcessor.process_complete_message(message.content)
    
    # Return the processed sections
    return {
        "message_id": message_id,
        "sections": sections
    } 