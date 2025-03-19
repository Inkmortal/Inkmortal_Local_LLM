"""
Summarization service for chat conversations.

This module provides functionality to summarize conversation history
and manage context window sizes efficiently.
"""
import logging
import json
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime

from .models import Conversation, Message
from .token_service import count_tokens, count_messages_tokens
from ...config import settings
from ...queue import QueuedRequest, RequestPriority, get_queue_manager

logger = logging.getLogger("app.api.chat.summarization_service")

class SummarizationService:
    """Service for summarizing conversation history"""
    
    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id
        self.queue_manager = get_queue_manager()
        
        # Load settings
        self.max_context_tokens = settings.max_context_tokens
        self.summarization_threshold = settings.summarization_threshold
        self.summarization_model = settings.summarization_model
        
        # Calculate token threshold
        self.token_threshold = int(self.max_context_tokens * (self.summarization_threshold / 100))
        
        logger.info(f"Summarization service initialized: model={self.summarization_model}, "
                   f"max_tokens={self.max_context_tokens}, threshold={self.token_threshold} tokens")
    
    async def check_context_size(self, conversation_id: str) -> Tuple[bool, int]:
        """Check if a conversation exceeds the context size threshold
        
        Args:
            conversation_id: ID of the conversation to check
            
        Returns:
            Tuple of (needs_summarization, current_token_count)
        """
        conversation = self.db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == self.user_id
        ).first()
        
        if not conversation:
            logger.warning(f"Conversation {conversation_id} not found for user {self.user_id}")
            return False, 0
            
        # Get all messages for context calculation
        messages = self.db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at).all()
        
        # Convert to format for token counting
        formatted_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
        
        # Add system prompt
        system_prompt = {
            "role": "system", 
            "content": "You are a helpful AI assistant that answers questions accurately and concisely."
        }
        formatted_messages.insert(0, system_prompt)
        
        # Calculate total tokens
        total_tokens = count_messages_tokens(formatted_messages, settings.default_model)
        logger.info(f"Conversation {conversation_id} context size: {total_tokens} tokens")
        
        # Check if over threshold
        needs_summarization = total_tokens > self.token_threshold
        if needs_summarization:
            logger.info(f"Conversation {conversation_id} exceeds threshold ({total_tokens} > {self.token_threshold})")
        
        return needs_summarization, total_tokens
    
    async def generate_summary(self, conversation_id: str) -> Tuple[bool, str]:
        """Generate a summary of the conversation history
        
        Args:
            conversation_id: ID of the conversation to summarize
            
        Returns:
            Tuple of (success, summary_or_error_message)
        """
        conversation = self.db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == self.user_id
        ).first()
        
        if not conversation:
            logger.warning(f"Conversation {conversation_id} not found for user {self.user_id}")
            return False, "Conversation not found"
            
        # Get messages to summarize
        last_summarized_id = conversation.last_summarized_message_id
        
        # Query to get messages to summarize
        if last_summarized_id:
            # Get all messages up to the last one we summarized previously
            query = self.db.query(Message).filter(
                Message.conversation_id == conversation_id,
                Message.id <= last_summarized_id  # Include the last_summarized_message
            ).order_by(Message.created_at)
        else:
            # Get all messages except the most recent (which usually will be the user's
            # message that triggered the summarization)
            count = self.db.query(Message).filter(
                Message.conversation_id == conversation_id
            ).count()
            
            # If only a few messages, don't summarize yet
            if count < 4:  # Arbitrary threshold
                logger.info(f"Not enough messages to summarize for conversation {conversation_id}: {count} < 4")
                return False, "Not enough messages to summarize"
                
            # Get all but the most recent message
            query = self.db.query(Message).filter(
                Message.conversation_id == conversation_id
            ).order_by(Message.created_at.asc()).limit(count - 1)
        
        messages_to_summarize = query.all()
        
        if not messages_to_summarize:
            logger.warning(f"No messages to summarize for conversation {conversation_id}")
            return False, "No messages to summarize"
            
        # Update last_summarized_message_id to the most recent message we're summarizing
        latest_message = messages_to_summarize[-1]
        
        # Format messages for LLM
        formatted_messages = [
            # System prompt instructing the LLM to create a summary
            {
                "role": "system",
                "content": (
                    "You are an AI assistant tasked with summarizing a conversation. "
                    "Create a concise summary of the key points, questions, and answers from the conversation history below. "
                    "Focus on preserving critical information while reducing token usage. "
                    "The summary should be detailed enough to provide context for continuing the conversation."
                )
            }
        ]
        
        # Add existing summary if present
        if conversation.conversation_summary:
            formatted_messages.append({
                "role": "system",
                "content": f"Previous conversation summary: {conversation.conversation_summary}\n\nIncorporate this previous summary with the new messages below."
            })
        
        # Add messages to summarize
        for msg in messages_to_summarize:
            formatted_messages.append({
                "role": msg.role,
                "content": msg.content
            })
            
        # Add final user message instructing the summarization
        formatted_messages.append({
            "role": "user",
            "content": (
                "Please provide a detailed conversation summary based on the messages above. "
                "The summary should include key topics, questions, and important information exchanged. "
                "This summary will be used as context for future messages, so make sure to preserve important details."
            )
        })
        
        # Create request object for the LLM
        request_body = {
            "messages": formatted_messages,
            "model": self.summarization_model,
            "stream": False,
            "temperature": 0.2,  # Lower temperature for more deterministic summary
        }
        
        # Create the queue request object
        request_obj = QueuedRequest(
            priority=RequestPriority.SYSTEM,  # Give summarization high priority
            endpoint="/api/chat/completions",
            body=request_body,
            user_id=self.user_id
        )
        
        try:
            logger.info(f"Processing summary request for conversation {conversation_id}")
            # Process request (non-streaming)
            summary_content = ""
            async for chunk in self.queue_manager.process_request(request_obj):
                try:
                    # Parse response
                    response = json.loads(chunk)
                    
                    # Extract content from various response formats
                    if "choices" in response and len(response["choices"]) > 0:
                        choice = response["choices"][0]
                        if "message" in choice and "content" in choice["message"]:
                            summary_content = choice["message"]["content"]
                    elif "response" in response:
                        summary_content = response["response"]
                    elif "content" in response:
                        summary_content = response["content"]
                except Exception as e:
                    logger.error(f"Error parsing summary response: {e}")
                    # If not JSON, use as-is
                    summary_content = chunk
            
            if not summary_content:
                logger.error(f"Failed to generate summary for conversation {conversation_id}")
                return False, "Failed to generate summary"
                
            # Update conversation with new summary
            conversation.conversation_summary = summary_content
            conversation.last_summarized_message_id = latest_message.id
            self.db.commit()
            
            # Log summary length and token count
            token_count = count_tokens(summary_content, settings.default_model)
            logger.info(f"Generated summary for conversation {conversation_id}: {len(summary_content)} chars, {token_count} tokens")
            
            return True, summary_content
            
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return False, f"Error: {str(e)}"
    
    def get_optimized_context(self, conversation_id: str, include_current_message: bool = False) -> List[Dict[str, Any]]:
        """Get optimized context for a conversation using summary if available
        
        Args:
            conversation_id: ID of the conversation to get context for
            include_current_message: If True, includes the most recent message
                                     This is useful when the user message is not yet saved
            
        Returns:
            List of message dictionaries formatted for the LLM context
        """
        conversation = self.db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == self.user_id
        ).first()
        
        if not conversation:
            logger.warning(f"Conversation {conversation_id} not found for user {self.user_id}")
            return []
            
        # Initialize context with system message
        context = [
            {
                "role": "system", 
                "content": "You are a helpful AI assistant that answers questions accurately and concisely. You have access to the complete conversation history for context."
            }
        ]
        
        # Add conversation summary if available
        if conversation.conversation_summary and conversation.last_summarized_message_id:
            # Add summary as system message
            context.append({
                "role": "system",
                "content": f"Conversation history summary: {conversation.conversation_summary}"
            })
            
            # Get messages after the last summarized message
            query = self.db.query(Message).filter(
                Message.conversation_id == conversation_id,
                Message.id > conversation.last_summarized_message_id
            ).order_by(Message.created_at)
            
            if not include_current_message:
                # Get all messages
                recent_messages = query.all()
            else:
                # Get all but the last message (which will be added by the caller)
                count = query.count()
                if count > 1:
                    recent_messages = query.limit(count - 1).all()
                else:
                    recent_messages = []
            
            # Add recent messages
            for msg in recent_messages:
                context.append({
                    "role": msg.role,
                    "content": msg.content
                })
                
            logger.info(f"Context built with summary + {len(recent_messages)} recent messages")
        else:
            # No summary - use all messages
            query = self.db.query(Message).filter(
                Message.conversation_id == conversation_id
            ).order_by(Message.created_at)
            
            if not include_current_message:
                # Get all messages
                messages = query.all()
            else:
                # Get all but the last message (which will be added by the caller)
                count = query.count()
                if count > 1:
                    messages = query.limit(count - 1).all()
                else:
                    messages = []
            
            for msg in messages:
                context.append({
                    "role": msg.role,
                    "content": msg.content
                })
                
            logger.info(f"Context built with {len(messages)} messages (no summary)")
        
        # Return the optimized context
        token_count = count_messages_tokens(context, settings.default_model)
        logger.info(f"Optimized context size: {token_count} tokens")
        
        return context