"""
Utility functions for the chat API.
"""
from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
import logging
from typing import Dict, Any, Optional, List
import uuid

from ...queue import QueueManagerInterface, get_queue_manager
from ...config import settings
from ...db import get_db

# Set up logger
logger = logging.getLogger("app.api.chat.utils")

# Create a FastAPI dependency for the queue manager
async def get_queue() -> QueueManagerInterface:
    """Get the queue manager instance"""
    queue_manager = get_queue_manager()
    # Ensure the manager is connected if not in test mode
    if not settings.is_testing:
        await queue_manager.ensure_connected()
    return queue_manager

def generate_id() -> str:
    """Generate a UUID string for database entities"""
    return str(uuid.uuid4())