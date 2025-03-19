"""
Token counting service for chat API.

This module provides utilities for counting tokens in messages
and managing context window sizes.
"""
import tiktoken
import logging
from typing import Dict, Any, List, Optional, Union
from sqlalchemy.orm import Session

from .models import Message

logger = logging.getLogger("app.api.chat.token_service")

# Cache the tokenizers for performance
_TOKENIZERS = {}

def get_tokenizer(model: str):
    """Get a tokenizer for the specified model"""
    if model not in _TOKENIZERS:
        try:
            # Handle common model mappings
            if "llama" in model.lower():
                encoding_name = "cl100k_base"  # Best match for Llama models
            elif "gpt-4" in model.lower():
                encoding_name = "cl100k_base"
            elif "gpt-3.5" in model.lower():
                encoding_name = "cl100k_base"
            else:
                # Default to cl100k_base as it's the most modern encoding
                encoding_name = "cl100k_base"
                
            _TOKENIZERS[model] = tiktoken.get_encoding(encoding_name)
            logger.info(f"Created tokenizer for {model} using {encoding_name} encoding")
        except Exception as e:
            logger.error(f"Error creating tokenizer for {model}: {e}")
            # Fallback to a simple approximation
            _TOKENIZERS[model] = None
            
    return _TOKENIZERS[model]

def count_tokens(text: str, model: str) -> int:
    """Count the number of tokens in a text string"""
    if not text:
        return 0
        
    tokenizer = get_tokenizer(model)
    if tokenizer:
        try:
            # Use the tokenizer
            tokens = tokenizer.encode(text)
            return len(tokens)
        except Exception as e:
            logger.error(f"Error counting tokens: {e}")
            # Fall back to simple approximation
            return simple_token_count(text)
    else:
        # Use simple approximation
        return simple_token_count(text)

def simple_token_count(text: str) -> int:
    """Simple approximation of token count when tokenizer is not available"""
    if not text:
        return 0
    # Words + extra for special tokens and potential subwords
    # This is a rough approximation - tiktoken will be more accurate
    return int(len(text.split()) * 1.3)

def count_message_tokens(message: Dict[str, Any], model: str) -> int:
    """Count tokens in a message dictionary"""
    # Format: {"role": "user", "content": "Hello"}
    if not message:
        return 0
        
    # Token counting formula based on OpenAI's guidelines
    # Different models have different message overhead - this is a conservative estimate
    tokens = 4  # Base overhead per message
    
    # Count role tokens
    role = message.get("role", "")
    tokens += count_tokens(role, model)
    
    # Count content tokens
    content = message.get("content", "")
    tokens += count_tokens(content, model)
    
    return int(tokens)

def count_messages_tokens(messages: List[Dict[str, Any]], model: str) -> int:
    """Count total tokens in a list of messages"""
    if not messages:
        return 0
        
    # Sum token counts for all messages
    total = 0
    for message in messages:
        total += count_message_tokens(message, model)
    
    # Add context overhead
    # Different models have different overhead
    total += 2  # General overhead for the context window
    
    return total