"""
API for chat conversations management and integration with LLM service.

This file is a backward-compatibility layer that re-exports components
from the modular chat package. All new code should use the modular structure.
"""

# Import and re-export the router from modular chat package
from .chat import router

# Re-export models for backward compatibility
from .chat.models import Conversation, Message

# Import necessary items for backward compatibility
import uuid
import logging
import asyncio

# Models and schema re-exports
from .chat.schemas import (
    MessageCreate, MessageResponse, ConversationResponse, 
    ConversationCreate, ConversationUpdate
)

# Re-export websocket manager
from .chat.websocket import manager

# Set up logger for backward compatibility
logger = logging.getLogger("app.api.chat")

# Export router for inclusion in app
__all__ = ["router"]