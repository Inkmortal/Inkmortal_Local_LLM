import asyncio
import httpx
import json
import time
import os
import enum
from typing import Dict, List, Any, Optional, AsyncGenerator
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import HTTPException
import logging

# Load environment variables
load_dotenv()

# Get Ollama API URL from environment or use default
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("queue_manager")

class RequestPriority(enum.IntEnum):
    """Priority levels for requests"""
    DIRECT_API = 1  # Highest priority (direct API access)
    CUSTOM_APP = 2  # Medium priority (custom applications)
    WEB_INTERFACE = 3  # Lowest priority (web interface)

class QueueManager:
    """
    Manages a priority-based queue for LLM requests.
    Implements the Singleton pattern to ensure only one queue exists.
    """
    _instance = None
    
    def __new__(cls):
        """Ensure only one instance of QueueManager exists"""
        if cls._instance is None:
            cls._instance = super(QueueManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize the queue manager if not already initialized"""
        if self._initialized:
            return
        
        # Initialize queues for each priority level
        self.queues = {
            RequestPriority.DIRECT_API: [],
            RequestPriority.CUSTOM_APP: [],
            RequestPriority.WEB_INTERFACE: []
        }
        
        # Lock for thread safety
        self.lock = asyncio.Lock()
        
        # Currently processing request
        self.current_request = None
        
        # Request history for monitoring
        self.request_history = []
        self.max_history_size = 100
        
        # Statistics
        self.stats = {
            "total_requests": 0,
            "completed_requests": 0,
            "failed_requests": 0,
            "avg_wait_time": 0,
            "avg_processing_time": 0
        }
        
        # Request aging configuration
        self.aging_threshold_seconds = 30  # Time before aging kicks in
        self.aging_check_interval = 5  # Seconds between aging checks
        
        # Start the aging task
        self.aging_task = asyncio.create_task(self._age_requests())
        
        # Mark as initialized
        self._initialized = True
        
        logger.info("Queue Manager initialized")
    
    async def add_request(self, request: Dict[str, Any]) -> int:
        """
        Add a request to the appropriate queue based on priority.
        Returns the position in the queue.
        """
        async with self.lock:
            # Add timestamp to request
            request["timestamp"] = time.time()
            request["status"] = "queued"
            request["original_priority"] = request.get("priority", RequestPriority.WEB_INTERFACE)
            
            # Get priority
            priority = request["original_priority"]
            
            # Add to appropriate queue
            self.queues[priority].append(request)
            
            # Update statistics
            self.stats["total_requests"] += 1
            
            # Calculate position in queue
            position = 0
            for p in sorted(self.queues.keys()):
                if p < priority:
                    position += len(self.queues[p])
                elif p == priority:
                    position += len(self.queues[p]) - 1  # -1 because we just added this request
            
            logger.info(f"Added request to queue with priority {priority}, position {position}")
            
            return position
    
    def get_queue_size(self) -> Dict[int, int]:
        """Get the current size of each queue"""
        return {
            priority.value: len(queue)
            for priority, queue in self.queues.items()
        }
    
    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the queue"""
        total_size = sum(len(queue) for queue in self.queues.values())
        
        return {
            "queue_size": total_size,
            "queue_by_priority": self.get_queue_size(),
            "current_request": self.current_request,
            "stats": self.stats
        }
    
    def clear_queue(self) -> None:
        """Clear all queues (admin only)"""
        for priority in self.queues:
            self.queues[priority] = []
        
        logger.info("All queues cleared")
    
    async def _age_requests(self) -> None:
        """
        Periodically check for old requests and promote them to higher priority.
        This prevents starvation of lower-priority requests.
        """
        while True:
            try:
                await asyncio.sleep(self.aging_check_interval)
                
                async with self.lock:
                    current_time = time.time()
                    
                    # Check medium priority queue (CUSTOM_APP)
                    for i, request in enumerate(self.queues[RequestPriority.CUSTOM_APP]):
                        wait_time = current_time - request["timestamp"]
                        
                        # If waiting for more than threshold, promote to DIRECT_API
                        if wait_time > self.aging_threshold_seconds:
                            logger.info(f"Promoting request from CUSTOM_APP to DIRECT_API due to aging: {wait_time:.2f}s")
                            request["priority"] = RequestPriority.DIRECT_API
                            request["promoted"] = True
                            request["promotion_time"] = current_time
                            
                            # Move to higher priority queue
                            self.queues[RequestPriority.DIRECT_API].append(request)
                            self.queues[RequestPriority.CUSTOM_APP].pop(i)
                    
                    # Check low priority queue (WEB_INTERFACE)
                    for i, request in enumerate(self.queues[RequestPriority.WEB_INTERFACE]):
                        wait_time = current_time - request["timestamp"]
                        
                        # If waiting for more than 2x threshold, promote to DIRECT_API
                        if wait_time > self.aging_threshold_seconds * 2:
                            logger.info(f"Promoting request from WEB_INTERFACE to DIRECT_API due to aging: {wait_time:.2f}s")
                            request["priority"] = RequestPriority.DIRECT_API
                            request["promoted"] = True
                            request["promotion_time"] = current_time
                            
                            # Move to highest priority queue
                            self.queues[RequestPriority.DIRECT_API].append(request)
                            self.queues[RequestPriority.WEB_INTERFACE].pop(i)
                        
                        # If waiting for more than threshold, promote to CUSTOM_APP
                        elif wait_time > self.aging_threshold_seconds:
                            logger.info(f"Promoting request from WEB_INTERFACE to CUSTOM_APP due to aging: {wait_time:.2f}s")
                            request["priority"] = RequestPriority.CUSTOM_APP
                            request["promoted"] = True
                            request["promotion_time"] = current_time
                            
                            # Move to medium priority queue
                            self.queues[RequestPriority.CUSTOM_APP].append(request)
                            self.queues[RequestPriority.WEB_INTERFACE].pop(i)
            
            except Exception as e:
                logger.error(f"Error in request aging task: {str(e)}")
    
    async def _get_next_request(self) -> Optional[Dict[str, Any]]:
        """Get the next request from the highest priority non-empty queue"""
        async with self.lock:
            for priority in sorted(self.queues.keys()):
                if self.queues[priority]:
                    # Get the oldest request from this priority queue
                    request = self.queues[priority].pop(0)
                    return request
            
            # No requests in any queue
            return None
    
    async def process_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a request by forwarding it to Ollama.
        For non-streaming requests.
        """
        # Wait until it's this request's turn
        while True:
            # If no request is being processed, try to process this one
            if self.current_request is None:
                async with self.lock:
                    next_request = await self._get_next_request()
                    if next_request and next_request["timestamp"] == request["timestamp"]:
                        # It's this request's turn
                        self.current_request = next_request
                        self.current_request["status"] = "processing"
                        self.current_request["processing_start"] = time.time()
                        break
            
            # Wait a bit before checking again
            await asyncio.sleep(0.1)
        
        try:
            # Forward request to Ollama
            endpoint = request["endpoint"].replace("/api", "")
            url = f"{OLLAMA_API_URL}{endpoint}"
            
            async with httpx.AsyncClient() as client:
                # Forward the request to Ollama
                response = await client.post(
                    url,
                    json=request["body"],
                    timeout=60.0  # Longer timeout for LLM requests
                )
                
                # Update request status
                self.current_request["status"] = "completed"
                self.current_request["processing_end"] = time.time()
                
                # Calculate timing statistics
                wait_time = self.current_request["processing_start"] - self.current_request["timestamp"]
                processing_time = self.current_request["processing_end"] - self.current_request["processing_start"]
                
                # Update statistics
                self.stats["completed_requests"] += 1
                self.stats["avg_wait_time"] = (
                    (self.stats["avg_wait_time"] * (self.stats["completed_requests"] - 1) + wait_time) / 
                    self.stats["completed_requests"]
                )
                self.stats["avg_processing_time"] = (
                    (self.stats["avg_processing_time"] * (self.stats["completed_requests"] - 1) + processing_time) / 
                    self.stats["completed_requests"]
                )
                
                # Add to history
                self._add_to_history(self.current_request)
                
                # Clear current request
                self.current_request = None
                
                # Return the response from Ollama
                return response.json()
        
        except Exception as e:
            # Update request status
            if self.current_request:
                self.current_request["status"] = "failed"
                self.current_request["error"] = str(e)
                self.current_request["processing_end"] = time.time()
                
                # Update statistics
                self.stats["failed_requests"] += 1
                
                # Add to history
                self._add_to_history(self.current_request)
                
                # Clear current request
                self.current_request = None
            
            # Re-raise the exception
            raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")
    
    async def process_streaming_request(self, request: Dict[str, Any]) -> AsyncGenerator[str, None]:
        """
        Process a streaming request by forwarding it to Ollama.
        Yields chunks of the streaming response.
        """
        # Wait until it's this request's turn
        while True:
            # If no request is being processed, try to process this one
            if self.current_request is None:
                async with self.lock:
                    next_request = await self._get_next_request()
                    if next_request and next_request["timestamp"] == request["timestamp"]:
                        # It's this request's turn
                        self.current_request = next_request
                        self.current_request["status"] = "processing"
                        self.current_request["processing_start"] = time.time()
                        break
            
            # Wait a bit before checking again
            await asyncio.sleep(0.1)
        
        try:
            # Forward request to Ollama
            endpoint = request["endpoint"].replace("/api", "")
            url = f"{OLLAMA_API_URL}{endpoint}"
            
            async with httpx.AsyncClient() as client:
                # Forward the request to Ollama with streaming
                async with client.stream(
                    "POST",
                    url,
                    json=request["body"],
                    timeout=300.0  # Longer timeout for streaming
                ) as response:
                    async for chunk in response.aiter_text():
                        # Yield each chunk to the client
                        yield chunk
                
                # Update request status
                self.current_request["status"] = "completed"
                self.current_request["processing_end"] = time.time()
                
                # Calculate timing statistics
                wait_time = self.current_request["processing_start"] - self.current_request["timestamp"]
                processing_time = self.current_request["processing_end"] - self.current_request["processing_start"]
                
                # Update statistics
                self.stats["completed_requests"] += 1
                self.stats["avg_wait_time"] = (
                    (self.stats["avg_wait_time"] * (self.stats["completed_requests"] - 1) + wait_time) / 
                    self.stats["completed_requests"]
                )
                self.stats["avg_processing_time"] = (
                    (self.stats["avg_processing_time"] * (self.stats["completed_requests"] - 1) + processing_time) / 
                    self.stats["completed_requests"]
                )
                
                # Add to history
                self._add_to_history(self.current_request)
                
                # Clear current request
                self.current_request = None
        
        except Exception as e:
            # Update request status
            if self.current_request:
                self.current_request["status"] = "failed"
                self.current_request["error"] = str(e)
                self.current_request["processing_end"] = time.time()
                
                # Update statistics
                self.stats["failed_requests"] += 1
                
                # Add to history
                self._add_to_history(self.current_request)
                
                # Clear current request
                self.current_request = None
            
            # Yield error message in the streaming format
            yield json.dumps({"error": f"Error processing request: {str(e)}"})
    
    def _add_to_history(self, request: Dict[str, Any]) -> None:
        """Add a request to the history, maintaining maximum history size"""
        # Create a copy with only the relevant fields
        history_entry = {
            "timestamp": request["timestamp"],
            "processing_start": request.get("processing_start"),
            "processing_end": request.get("processing_end"),
            "original_priority": request.get("original_priority"),
            "final_priority": request.get("priority"),
            "promoted": request.get("promoted", False),
            "status": request["status"],
            "endpoint": request["endpoint"],
            "user": request.get("user"),
            "auth_type": request.get("auth_type"),
            "wait_time": request.get("processing_start", 0) - request["timestamp"] if request.get("processing_start") else 0
        }
        
        # Add to history
        self.request_history.append(history_entry)
        
        # Trim history if needed
        if len(self.request_history) > self.max_history_size:
            self.request_history = self.request_history[-self.max_history_size:]
    
    def get_history(self) -> List[Dict[str, Any]]:
        """Get the request history"""
        return self.request_history