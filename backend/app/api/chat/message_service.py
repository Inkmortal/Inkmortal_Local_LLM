"""
WebSocket-based chat message handling for real-time streaming responses.
"""
import json
import logging
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio

from fastapi import HTTPException, Depends, status
from fastapi.encoders import jsonable_encoder
from pydantic import ValidationError

from ...auth.models import User
from ..models import Message, Chat
from ...config import settings
from ...queue.base import QueuedRequest, RequestPriority
from ...queue.interface import get_queue_manager
from .models import Message as ChatMessage
from .schemas import CreateChatRequest, GetChatResponse, MessageResponse
from .utils import strip_editor_html
from .websocket import manager

# Configure logger
logger = logging.getLogger(__name__)

async def create_chat(request: CreateChatRequest, current_user: User) -> GetChatResponse:
    """Create a new chat conversation."""
    chat_id = str(uuid.uuid4())
    
    # Create chat object with metadata
    chat = Chat(
        id=chat_id,
        title=request.title or "New Chat",
        user_id=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        metadata=request.metadata or {}
    )
    
    # Save to database here...
    # For now, just return the chat object
    return GetChatResponse(
        id=chat.id,
        title=chat.title,
        created_at=chat.created_at,
        updated_at=chat.updated_at,
        metadata=chat.metadata
    )

async def get_chat(chat_id: str, current_user: User) -> GetChatResponse:
    """Get a chat by ID."""
    # In a real implementation, this would fetch from a database
    # Here we just return a mock chat
    
    mock_chat = Chat(
        id=chat_id,
        title="Retrieved Chat",
        user_id=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    return GetChatResponse(
        id=mock_chat.id,
        title=mock_chat.title,
        created_at=mock_chat.created_at,
        updated_at=mock_chat.updated_at,
        metadata=mock_chat.metadata or {}
    )

async def list_chats(current_user: User) -> List[GetChatResponse]:
    """List all chats for a user."""
    # Mock implementation - would query database in real implementation
    chats = [
        Chat(
            id=str(uuid.uuid4()),
            title=f"Chat {i}",
            user_id=current_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        for i in range(1, 6)  # Creating 5 mock chats
    ]
    
    return [
        GetChatResponse(
            id=chat.id,
            title=chat.title,
            created_at=chat.created_at,
            updated_at=chat.updated_at,
            metadata=chat.metadata or {}
        )
        for chat in chats
    ]

async def rename_chat(chat_id: str, title: str, current_user: User) -> GetChatResponse:
    """Rename a chat conversation."""
    # Mock implementation - would update database in real implementation
    mock_chat = Chat(
        id=chat_id,
        title=title,
        user_id=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    return GetChatResponse(
        id=mock_chat.id,
        title=mock_chat.title,
        created_at=mock_chat.created_at,
        updated_at=mock_chat.updated_at,
        metadata=mock_chat.metadata or {}
    )

async def delete_chat(chat_id: str, current_user: User) -> Dict[str, bool]:
    """Delete a chat conversation."""
    # Mock implementation - would delete from database in real implementation
    return {"success": True}

async def create_message(
    chat_id: str, 
    message_text: str, 
    current_user: User,
    file_data: Optional[Dict[str, Any]] = None
) -> MessageResponse:
    """Create a new message and generate a response."""
    try:
        # First check if the message is empty
        if not message_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty"
            )
            
        # Generate message IDs
        user_message_id = str(uuid.uuid4())
        message_id = str(uuid.uuid4())
        
        # Save the user message to the database
        # This would be a database operation in a real implementation
        
        # Save conversation ID for WebSocket response
        # This allows us to route responses back to the right conversation
        conv_id = chat_id
        
        # The user's ID for WebSocket
        user_id = current_user.id
        
        # Verify the conversation exists for this user
        # In a real implementation, this would check the database
        
        # Create the user message response
        user_message = MessageResponse(
            id=user_message_id,
            chat_id=chat_id,
            role="user",
            content=message_text,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Create a placeholder for the assistant's message
        # This will be updated when we get the response
        assistant_message = MessageResponse(
            id=message_id,
            chat_id=chat_id,
            role="assistant",
            content="",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Launch async task to generate response
        asyncio.create_task(
            generate_response(
                message_text,
                message_id,
                conv_id,
                user_id,
                file_data
            )
        )
        
        # Return both messages
        return assistant_message
        
    except Exception as e:
        logger.error(f"Error creating message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating message: {str(e)}"
        )

async def generate_response(
    message_text: str,
    message_id: str,
    conv_id: str,
    user_id: int,
    file_data: Optional[Dict[str, Any]] = None
) -> None:
    """Generate a response to a user message using the LLM."""
    try:
        # Get the queue manager
        queue_manager = await get_queue_manager()
        
        # Update message status to processing
        await manager.send_update(user_id, {
            "type": "message_update",
            "message_id": message_id,
            "conversation_id": conv_id,
            "status": "PROCESSING"
        })
        
        try:
            # Queue LLM request using correct parameter order
            request_obj = QueuedRequest(
                priority=RequestPriority.WEB_INTERFACE,  # Use correct enum value
                endpoint="/api/llm/generate",  # Endpoint for LLM generation
                body={
                    "messages": [{"role": "user", "content": strip_editor_html(message_text)}],  # Strip editor HTML but keep pasted HTML
                    "model": settings.default_model,  # Use the model configured in settings
                    "stream": True,  # Enable streaming for token-by-token updates
                    "conversation_id": conv_id,
                    "message_id": message_id,
                    "system": "You are a helpful AI assistant that answers questions accurately and concisely.",
                    "temperature": settings.temperature,
                    # Include tools if enabled in settings
                    **({"tools": []} if settings.tool_calling_enabled else {})
                },
                user_id=user_id
            )
            
            # Track this request for WebSocket updates
            manager.track_request(request_obj.timestamp.timestamp(), user_id)
            
            # Send to Ollama and handle response
            try:
                # First update status to processing
                await manager.send_update(user_id, {
                    "type": "message_update",
                    "message_id": message_id,
                    "conversation_id": conv_id,
                    "status": "PROCESSING"
                })
                
                # Check if we should use streaming
                if request_obj.body.get("stream", False):
                    # Process with streaming
                    logger.info("Using streaming mode for LLM request")
                    
                    # Don't send initial empty streaming status - this prevents flickering
                    # We'll set status with the first content chunk instead
                    
                    # Collect full content as we stream
                    assistant_content = ""
                    first_chunk = True
                    
                    # Stream chunks as they come
                    try:
                        async for chunk in queue_manager.process_streaming_request(request_obj):
                            # Try to parse as JSON
                            try:
                                chunk_data = json.loads(chunk)
                                # Extract content based on format
                                content = None
                                if "delta" in chunk_data and "content" in chunk_data["delta"]:
                                    content = chunk_data["delta"]["content"]
                                elif "response" in chunk_data:
                                    content = chunk_data["response"]
                                elif "content" in chunk_data:
                                    content = chunk_data["content"]
                                
                                if content:
                                    # Send chunk to client
                                    await manager.send_update(user_id, {
                                        "type": "message_update",
                                        "message_id": message_id,
                                        "conversation_id": conv_id,
                                        "status": "STREAMING",
                                        "assistant_content": content,
                                        "content_update_type": "APPEND",
                                        "is_complete": False
                                    })
                                    assistant_content += content
                            except json.JSONDecodeError:
                                # Raw text chunk
                                await manager.send_update(user_id, {
                                    "type": "message_update",
                                    "message_id": message_id,
                                    "conversation_id": conv_id,
                                    "status": "STREAMING",
                                    "assistant_content": chunk,
                                    "content_update_type": "APPEND",
                                    "is_complete": False
                                })
                                assistant_content += chunk
                            except Exception as e:
                                logger.error(f"Error processing streaming chunk: {str(e)}")
                    except Exception as streaming_error:
                        logger.error(f"Streaming error: {str(streaming_error)}")
                        assistant_content += f"\n\nStreaming error: {str(streaming_error)}"
                    
                    # Create response object for compatibility with the rest of the code
                    llm_response = {
                        "choices": [{
                            "message": {
                                "role": "assistant", 
                                "content": assistant_content
                            }
                        }]
                    }
                else:
                    # Fall back to non-streaming
                    logger.info("Using non-streaming mode for LLM request")
                    llm_response = await queue_manager.process_request(request_obj)
                
                # Handle the response if successful
                if llm_response:
                    # Extract assistant message from LLM response
                    try:
                        if "choices" in llm_response and len(llm_response["choices"]) > 0:
                            choice = llm_response["choices"][0]
                            if "message" in choice:
                                assistant_text = choice["message"].get("content", "")
                                
                                # Update message in database (in a real implementation)
                                # Here we just send a WebSocket update
                                
                                # Send complete update
                                await manager.send_update(user_id, {
                                    "type": "message_update",
                                    "message_id": message_id,
                                    "conversation_id": conv_id,
                                    "status": "COMPLETE",
                                    "assistant_content": assistant_text,
                                    "content_update_type": "REPLACE",
                                    "is_complete": True
                                })
                            else:
                                raise ValueError("No message in LLM response choice")
                        else:
                            raise ValueError("No choices in LLM response")
                    except Exception as e:
                        # If we can't parse the response, log error and respond as best we can
                        logger.error(f"Error parsing LLM response: {str(e)}")
                        error_message = "I apologize, but I encountered an error while processing your request."
                        
                        # Send error update
                        await manager.send_update(user_id, {
                            "type": "message_update",
                            "message_id": message_id,
                            "conversation_id": conv_id,
                            "status": "ERROR",
                            "assistant_content": error_message,
                            "error": f"Error parsing LLM response: {str(e)}"
                        })
                else:
                    # If no response was received
                    logger.error("No response received from LLM")
                    
                    # Send error update
                    await manager.send_update(user_id, {
                        "type": "message_update",
                        "message_id": message_id,
                        "conversation_id": conv_id,
                        "status": "ERROR",
                        "assistant_content": "I apologize, but I didn't receive a response. Please try again.",
                        "error": "No response received from LLM"
                    })
                
            except Exception as e:
                # If we encounter an error while processing
                logger.error(f"Error processing LLM request: {str(e)}")
                
                # Send error update
                await manager.send_update(user_id, {
                    "type": "message_update",
                    "message_id": message_id,
                    "conversation_id": conv_id,
                    "status": "ERROR",
                    "assistant_content": f"I apologize, but I encountered an error: {str(e)}",
                    "error": str(e)
                })
            
            # Untrack the request
            manager.untrack_request(request_obj.timestamp.timestamp())
            
        except Exception as e:
            # If we encounter an error while setting up the request
            logger.error(f"Error setting up LLM request: {str(e)}")
            
            # Send error update
            await manager.send_update(user_id, {
                "type": "message_update",
                "message_id": message_id,
                "conversation_id": conv_id,
                "status": "ERROR",
                "assistant_content": f"I apologize, but I encountered an error while setting up your request: {str(e)}",
                "error": str(e)
            })
    
    except Exception as e:
        # Catch-all for any other errors
        logger.error(f"Unexpected error in generate_response: {str(e)}")
        # Try to send an error update if possible
        try:
            await manager.send_update(user_id, {
                "type": "message_update",
                "message_id": message_id,
                "conversation_id": conv_id,
                "status": "ERROR",
                "assistant_content": "I apologize, but I encountered an unexpected error.",
                "error": str(e)
            })
        except Exception as send_error:
            # If we can't even send an error update
            logger.error(f"Failed to send error update: {str(send_error)}")

async def list_messages(chat_id: str, current_user: User) -> List[MessageResponse]:
    """List all messages in a chat conversation."""
    # This would fetch from a database in a real implementation
    # Here we just return some mock messages
    
    messages = [
        ChatMessage(
            id=str(uuid.uuid4()),
            chat_id=chat_id,
            user_id=current_user.id,
            role="user" if i % 2 == 0 else "assistant",
            content=f"This is message {i+1}",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        for i in range(10)  # 10 mock messages
    ]
    
    return [
        MessageResponse(
            id=message.id,
            chat_id=message.chat_id,
            role=message.role,
            content=message.content,
            created_at=message.created_at,
            updated_at=message.updated_at,
            metadata=message.metadata or {}
        )
        for message in messages
    ]