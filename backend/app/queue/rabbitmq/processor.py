import logging
import json
from typing import Dict, Any, Optional, AsyncGenerator, List
import asyncio
import httpx
from datetime import datetime

# Import LangChain components
from langchain.chat_models import ChatOllama
from langchain.schema import HumanMessage, SystemMessage, AIMessage
from langchain_core.messages import BaseMessage

from ..models import QueuedRequest, QueueStats
from ...config import settings

# Configure logging
logger = logging.getLogger("rabbitmq_processor")

class RequestProcessor:
    """Handles request processing and streaming"""
    
    def __init__(self, ollama_url: str):
        self.ollama_url = ollama_url
        self.current_request: Optional[QueuedRequest] = None
        self.stats = QueueStats()  # Initialize stats here
        self.processing_lock = asyncio.Lock()  # Add a lock
        
        # Initialize LangChain Ollama client if enabled
        self.use_langchain = settings.use_langchain
        if self.use_langchain:
            self.langchain_client = None  # Will be initialized per request with model name
    
    async def process_request(self, request: QueuedRequest) -> Dict[str, Any]:
        """Process a request synchronously with timeout handling"""

        async with self.processing_lock:  # Use the lock
            self.current_request = request
            self.current_request.status = "processing"
            self.current_request.processing_start = datetime.utcnow()
            
            try:
                # Determine whether to use LangChain or direct API
                if self.use_langchain:
                    # Process with LangChain
                    return await self._process_with_langchain(request)
                else:
                    # Process with direct API call
                    return await self._process_with_direct_api(request)
                
            except Exception as e:
                # Log the error
                logger.error(f"Error processing request: {str(e)}")
                if self.current_request:
                    self.current_request.status = "failed"
                    self.current_request.error = str(e)
                    self.current_request.processing_end = datetime.utcnow()
                    self.stats.failed_requests += 1
                    self.current_request = None
                
                # Return error in a format compatible with our API
                return {
                    "choices": [{
                        "message": {
                            "role": "assistant",
                            "content": f"I encountered an error while processing your request: {str(e)}. Please try again."
                        },
                        "index": 0,
                        "finish_reason": "error"
                    }],
                    "error": str(e)
                }
    
    async def _process_with_langchain(self, request: QueuedRequest) -> Dict[str, Any]:
        """Process request using LangChain with Ollama"""
        
        try:
            # Get model from request body
            model_name = request.body.get("model", settings.default_model)
            
            # Initialize LangChain client with the model
            langchain_client = ChatOllama(
                base_url=self.ollama_url,
                model=model_name,
                temperature=settings.langchain_temperature
            )
            
            # Convert OpenAI-style messages to LangChain format
            langchain_messages = []
            
            for msg in request.body.get("messages", []):
                role = msg.get("role", "user")
                content = msg.get("content", "")
                
                if role == "system":
                    langchain_messages.append(SystemMessage(content=content))
                elif role == "user":
                    langchain_messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    langchain_messages.append(AIMessage(content=content))
            
            # Set timeout for LangChain request
            timeout_seconds = 120.0  # 2 minutes max processing time
            
            # Call LangChain with timeout
            langchain_response = await asyncio.wait_for(
                langchain_client.agenerate([langchain_messages]),
                timeout=timeout_seconds
            )
            
            # Get response text
            assistant_response = langchain_response.generations[0][0].text
            
            # Format to OpenAI-compatible structure
            response_data = {
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": assistant_response
                        },
                        "index": 0,
                        "finish_reason": "stop"
                    }
                ],
                "model": model_name,
                "object": "chat.completion",
                "usage": {} # LangChain doesn't provide usage statistics in the same format
            }
            
            # Update request status
            self.current_request.status = "completed"
            self.current_request.processing_end = datetime.utcnow()
            
            # Update statistics
            self._update_stats(self.current_request)
            
            # Log success
            logger.info(f"Successfully processed request with LangChain: {model_name}")
            
            # Clear current request
            self.current_request = None
            
            return response_data
            
        except asyncio.TimeoutError:
            # Handle timeout specifically
            logger.warning(f"LangChain request timed out after {timeout_seconds} seconds")
            if self.current_request:
                self.current_request.status = "failed"
                self.current_request.error = f"Request timed out after {timeout_seconds} seconds"
                self.current_request.processing_end = datetime.utcnow()
                self.stats.failed_requests += 1
                self.current_request = None
            
            return {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": f"Sorry, the request timed out after {timeout_seconds} seconds. Please try again with a shorter message."
                    },
                    "index": 0,
                    "finish_reason": "timeout"
                }],
                "error": f"Request timed out after {timeout_seconds} seconds"
            }
            
        except Exception as e:
            # Handle other errors
            logger.error(f"Error in LangChain processing: {str(e)}")
            if self.current_request:
                self.current_request.status = "failed" 
                self.current_request.error = str(e)
                self.current_request.processing_end = datetime.utcnow()
                self.stats.failed_requests += 1
                self.current_request = None
            
            return {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": f"I encountered an error while processing your request with LangChain: {str(e)}. Please try again."
                    }, 
                    "index": 0,
                    "finish_reason": "error"
                }],
                "error": str(e)
            }
    
    async def _process_with_direct_api(self, request: QueuedRequest) -> Dict[str, Any]:
        """Process request using direct API call to Ollama"""
        
        # Forward to Ollama
        endpoint = request.endpoint.replace("/api", "")
        url = f"{self.ollama_url}{endpoint}"
        
        # Create a timeout task
        timeout_seconds = 120.0  # 2 minutes max processing time
        
        try:
            async with httpx.AsyncClient() as client:
                # Use asyncio.wait_for to add a timeout
                response = await asyncio.wait_for(
                    client.post(
                        url,
                        json=request.body,
                        timeout=60.0  # HTTPX timeout
                    ),
                    timeout=timeout_seconds  # Overall timeout
                )
                
                # Update request status
                self.current_request.status = "completed"
                self.current_request.processing_end = datetime.utcnow()
                
                # Update statistics
                self._update_stats(self.current_request)
                
                # Get response data and log it
                response_data = response.json()
                
                # Check response format and make it compatible with OpenAI format
                if response_data and not response_data.get("choices") and response_data.get("response"):
                    logger.info("Converting Ollama response format to OpenAI format...")
                    # Transform Ollama response to OpenAI format
                    response_data = {
                        "choices": [
                            {
                                "message": {
                                    "role": "assistant",
                                    "content": response_data.get("response")
                                },
                                "index": 0,
                                "finish_reason": "stop"
                            }
                        ],
                        "model": response_data.get("model") or request.body.get("model"),
                        "object": "chat.completion",
                        "usage": response_data.get("usage", {})
                    }
                
                # Log response structure for debugging
                logger.info(f"Response keys: {list(response_data.keys())}")
                if response_data.get("choices"):
                    logger.info(f"Choices count: {len(response_data['choices'])}")
                    if len(response_data['choices']) > 0:
                        logger.info(f"First choice keys: {list(response_data['choices'][0].keys())}")
                
                # Clear current request
                self.current_request = None
                
                return response_data
                
        except asyncio.TimeoutError:
            # Handle timeout specifically
            logger.warning(f"Request timed out after {timeout_seconds} seconds: {request.endpoint}")
            if self.current_request:
                self.current_request.status = "failed"
                self.current_request.error = f"Request timed out after {timeout_seconds} seconds"
                self.current_request.processing_end = datetime.utcnow()
                self.stats.failed_requests += 1
                self.current_request = None
            
            return {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": f"Sorry, the request timed out after {timeout_seconds} seconds. Please try again with a shorter message."
                    },
                    "index": 0,
                    "finish_reason": "timeout"
                }],
                "error": f"Request timed out after {timeout_seconds} seconds"
            }
            
        except Exception as e:
            # Log the error
            logger.error(f"Error processing request: {str(e)}")
            if self.current_request:
                self.current_request.status = "failed"
                self.current_request.error = str(e)
                self.current_request.processing_end = datetime.utcnow()
                self.stats.failed_requests += 1
                self.current_request = None
            
            # Return error in a format compatible with our API
            return {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": f"I encountered an error while processing your request: {str(e)}. Please try again."
                    },
                    "index": 0,
                    "finish_reason": "error"
                }],
                "error": str(e)
            }
    
    async def process_streaming_request(
        self,
        request: QueuedRequest
    ) -> AsyncGenerator[str, None]:
        """Process a streaming request with timeout handling"""

        async with self.processing_lock:
            self.current_request = request
            self.current_request.status = "processing"
            self.current_request.processing_start = datetime.utcnow()
            
            timeout_seconds = 600.0  # 10 minutes max for streaming
            
            try:
                endpoint = request.endpoint.replace("/api", "")
                url = f"{self.ollama_url}{endpoint}"
                
                # Use a manual timeout approach for streaming
                start_time = asyncio.get_event_loop().time()
                
                async with httpx.AsyncClient() as client:
                    try:
                        async with client.stream(
                            "POST",
                            url,
                            json=request.body,
                            timeout=300.0
                        ) as response:
                            async for chunk in response.aiter_text():
                                # Check if we've exceeded our timeout
                                current_time = asyncio.get_event_loop().time()
                                if current_time - start_time > timeout_seconds:
                                    logger.warning(f"Streaming request timed out after {timeout_seconds}s: {request.endpoint}")
                                    yield json.dumps({"error": f"Stream timed out after {timeout_seconds}s"})
                                    break
                                    
                                yield chunk
                                
                                # Reset timeout timer on each chunk
                                start_time = current_time
                    except httpx.ReadTimeout:
                        logger.warning(f"HTTPX timeout for streaming request: {request.endpoint}")
                        yield json.dumps({"error": "Connection timeout"})
                
                # Only complete if we didn't break out early due to timeout
                if asyncio.get_event_loop().time() - start_time <= timeout_seconds:
                    # Update request status
                    self.current_request.status = "completed"
                    self.current_request.processing_end = datetime.utcnow()
                    self._update_stats(self.current_request)
                else:
                    # Mark as failed if we timed out
                    self.current_request.status = "failed"
                    self.current_request.error = f"Stream timed out after {timeout_seconds}s"
                    self.current_request.processing_end = datetime.utcnow()
                    self.stats.failed_requests += 1
            
            except Exception as e:
                logger.error(f"Error in streaming request: {str(e)}")
                if self.current_request:
                    self.current_request.status = "failed"
                    self.current_request.error = str(e)
                    self.current_request.processing_end = datetime.utcnow()
                    self.stats.failed_requests += 1
                
                yield json.dumps({"error": str(e)})
            
            finally:
                # Always clear the current request
                self.current_request = None
    
    def _update_stats(self, request: QueuedRequest) -> None:
        """Update statistics from completed request"""
        if not request.processing_start or not request.processing_end:
            return
        
        wait_time = (request.processing_start - request.timestamp).total_seconds()
        processing_time = (request.processing_end - request.processing_start).total_seconds()
        
        self.stats.update_timing(wait_time, processing_time)
        self.stats.completed_requests += 1

    async def get_stats(self) -> QueueStats:
        """Get queue statistics"""
        return self.stats

    async def reset_stats(self) -> None:
        """Reset queue statistics"""
        self.stats = QueueStats()