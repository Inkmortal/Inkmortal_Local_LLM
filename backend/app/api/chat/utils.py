"""
Utility functions for the chat API.
"""
from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
import logging
from typing import Dict, Any, Optional, List, Callable
import uuid
import re

from ...queue import QueueManagerInterface, get_queue_manager
from ...config import settings
from ...db import get_db

# Set up logger
logger = logging.getLogger("app.api.chat.utils")

# Create a FastAPI dependency for the queue manager
def get_queue() -> QueueManagerInterface:
    """
    Get the queue manager instance (synchronous version)
    
    The connection is established at application startup in main.py,
    so we don't need to ensure connection here.
    For endpoints that need to ensure fresh connection, they should
    explicitly call await queue_manager.ensure_connected()
    """
    return get_queue_manager()

def generate_id() -> str:
    """Generate a UUID string for database entities"""
    return str(uuid.uuid4())

def strip_html_tags(text: str) -> str:
    """Strip HTML tags from text, preserving line breaks and content"""
    if not text:
        return ""
    
    # Replace common HTML elements with appropriate text versions
    replacements = [
        (r'<p[^>]*>(.*?)</p>', r'\1\n\n'),  # Paragraphs to double newlines
        (r'<br[^>]*>', '\n'),              # <br> to newline
        (r'<li[^>]*>(.*?)</li>', r'• \1\n'), # List items to bullets
        (r'<div[^>]*>(.*?)</div>', r'\1\n'), # Divs to single newlines
        (r'<h[1-6][^>]*>(.*?)</h[1-6]>', r'\1\n\n') # Headers to text + double newlines
    ]
    
    # Apply replacements
    for pattern, replacement in replacements:
        text = re.sub(pattern, replacement, text, flags=re.DOTALL)
    
    # Remove all other HTML tags
    text = re.sub(r'<[^>]*>', '', text)
    
    # Fix extra whitespace and newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    text = text.strip()
    
    return text

def strip_editor_html(text: str) -> str:
    """Strip only editor-generated HTML tags while preserving intentionally pasted HTML content.
    
    This function focuses on removing the wrapper tags added by TipTap editor
    but preserves complex HTML that users may have intentionally pasted.
    """
    if not text:
        return ""
    
    # Check if this looks like editor-generated HTML (simple content wrapped in paragraphs)
    simple_pattern = r'^(<p>.*?</p>)+$'
    if re.match(simple_pattern, text, re.DOTALL):
        # Handle editor content - only remove paragraph tags and line breaks
        replacements = [
            (r'<p[^>]*>(.*?)</p>', r'\1\n\n'),  # Paragraphs to double newlines
            (r'<br[^>]*>', '\n'),               # <br> to newline
        ]
        
        for pattern, replacement in replacements:
            text = re.sub(pattern, replacement, text, flags=re.DOTALL)
        
        # Fix extra whitespace and newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r' {2,}', ' ', text)
        text = text.strip()
        return text
    else:
        # This might be intentionally pasted HTML - return it unmodified
        return text

def execute_with_safe_transaction(db: Session, sql_command: str) -> None:
    """Execute a SQL command with proper error handling
    
    Args:
        db: Database session
        sql_command: Raw SQL command to execute
    """
    try:
        db.execute(text(sql_command))
    except Exception as e:
        logger.error(f"Error executing transaction command: {str(e)}")
        # Just log and continue, don't raise
        pass