"""
Mock queue manager implementation for testing.
"""

import json
import asyncio
from typing import Dict, Any, Optional, List, AsyncGenerator
from datetime import datetime
from collections import defaultdict

from ..interface import QueueManagerInterface
from ..models import QueuedRequest, QueueStats, RequestPriority

class MockQueueManager(QueueManagerInterface):
    """
    Mock implementation of QueueManagerInterface for testing.
    Provides in-memory queue functionality without external dependencies.
    """
    
    _instance = None
    
    def __new__(cls):
        """Ensure singleton instance"""
        if cls._instance is None:
            cls._instance = super(MockQueueManager, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize the mock queue manager"""
        self._initialized = getattr(self, '_initialized', False)
        if self._initialized:
            return
            
        # Priority queues (each is a list of requests by priority)
        self.queues = {
            RequestPriority.DIRECT_API: [],
            RequestPriority.CUSTOM_APP: [],
            RequestPriority.WEB_INTERFACE: [],
        }
        
        # Request history
        self.request_history: List[Dict[str, Any]] = []
        self.max_history_size = 100
        
        # Queue stats
        self.stats = QueueStats()
        self.aging_threshold_seconds = 30
        
        # Current request being processed
        self.current_request: Optional[QueuedRequest] = None
        
        # Connected status
        self.is_connected = False
        
        self._initialized = True
    
    async def connect(self) -> None:
        """Connect to the queue system (mock)"""
        self.is_connected = True
    
    async def ensure_connected(self) -> None:
        """Ensure connection is established"""
        if not self.is_connected:
            await self.connect()
    
    async def close(self) -> None:
        """Close the queue connection"""
        self.is_connected = False
    
    async def add_request(self, request: QueuedRequest) -> int:
        """Add a request to the queue"""
        await self.ensure_connected()
        
        # Update stats
        self.stats.total_requests += 1
        
        # Add to appropriate queue
        self.queues[request.priority].append(request)
        
        # Calculate position in queue
        position = 0
        for priority in sorted(RequestPriority):
            if priority < request.priority:
                position += len(self.queues[priority])
            elif priority == request.priority:
                position += len(self.queues[priority]) - 1
                
        return position
    
    async def get_next_request(self) -> Optional[QueuedRequest]:
        """Get the next request from the highest priority non-empty queue"""
        await self.ensure_connected()
        
        for priority in sorted(RequestPriority):
            if self.queues[priority]:
                # Get and remove first request from queue
                request = self.queues[priority].pop(0)
                return request
                
        return None
    
    async def process_request(self, request: QueuedRequest) -> Dict[str, Any]:
        """Process a request synchronously (mock implementation)"""
        await self.ensure_connected()
        self.current_request = request
        
        # Update request info
        request.status = "processing"
        request.processing_start = datetime.utcnow()
        
        # Sleep briefly to simulate processing time
        await asyncio.sleep(0.1)
        
        # Update request status
        request.status = "completed"
        request.processing_end = datetime.utcnow()
        
        # Update stats
        self._update_stats(request)
        
        # Add to history
        self._add_to_history(request)
        
        # Generate mock response
        response = self._generate_mock_response(request)
        
        # Clear current request
        self.current_request = None
        
        return response
    
    async def process_streaming_request(self, request: QueuedRequest) -> AsyncGenerator[str, None]:
        """Process a request with streaming response (mock implementation)"""
        await self.ensure_connected()
        self.current_request = request
        
        # Update request info
        request.status = "processing"
        request.processing_start = datetime.utcnow()
        
        # Generate mock streaming response
        chunks = self._generate_mock_streaming_chunks(request)
        
        for chunk in chunks:
            await asyncio.sleep(0.05)  # Simulate streaming delay
            yield chunk
        
        # Update request status
        request.status = "completed"
        request.processing_end = datetime.utcnow()
        
        # Update stats
        self._update_stats(request)
        
        # Add to history
        self._add_to_history(request)
        
        # Clear current request
        self.current_request = None
    
    async def clear_queue(self) -> None:
        """Clear all queues"""
        await self.ensure_connected()
        for priority in RequestPriority:
            self.queues[priority] = []
    
    async def get_queue_size(self) -> Dict[int, int]:
        """Get the current size of each priority queue"""
        await self.ensure_connected()
        
        sizes = {}
        for priority in RequestPriority:
            sizes[priority] = len(self.queues[priority])
            
        return sizes
    
    async def get_status(self) -> Dict[str, Any]:
        """Get the current status of the queue system"""
        await self.ensure_connected()
        
        sizes = await self.get_queue_size()
        
        return {
            "queue_size": sum(sizes.values()),
            "queue_by_priority": sizes,
            "current_request": self.current_request.to_dict() if self.current_request else None,
            "stats": self.stats.to_dict(),
            "rabbitmq_connected": self.is_connected
        }
    
    def get_history(self) -> List[Dict[str, Any]]:
        """Get the request history"""
        return self.request_history
    
    async def promote_request(self, request: QueuedRequest, new_priority: int) -> None:
        """Promote a request to a higher priority"""
        if new_priority >= request.priority:
            raise ValueError("New priority must be higher (lower number)")
            
        # Find request in current queue
        if request in self.queues[request.priority]:
            # Remove from current queue
            self.queues[request.priority].remove(request)
            
            # Update priority
            request.priority = new_priority
            request.promoted = True
            request.promotion_time = datetime.utcnow()
            
            # Add to new queue
            self.queues[new_priority].append(request)
    
    async def handle_request_aging(self) -> None:
        """Handle aging of requests in queues"""
        # Identify aged requests by their timestamp
        current_time = datetime.utcnow()
        
        # Check WEB_INTERFACE queue for aging to CUSTOM_APP
        web_aged = []
        for i, request in enumerate(self.queues[RequestPriority.WEB_INTERFACE]):
            age_seconds = (current_time - request.timestamp).total_seconds()
            if age_seconds > self.aging_threshold_seconds:
                web_aged.append(i)  # Store index instead of request
        
        # Promote aged WEB_INTERFACE requests (in reverse to avoid index shifting)
        for i in sorted(web_aged, reverse=True):
            request = self.queues[RequestPriority.WEB_INTERFACE].pop(i)
            request.priority = RequestPriority.CUSTOM_APP
            request.promoted = True
            request.promotion_time = datetime.utcnow()
            self.queues[RequestPriority.CUSTOM_APP].append(request)
            
        # Check CUSTOM_APP queue for aging to DIRECT_API
        app_aged = []
        for i, request in enumerate(self.queues[RequestPriority.CUSTOM_APP]):
            age_seconds = (current_time - request.timestamp).total_seconds()
            # Only age requests that were already aged once
            if age_seconds > self.aging_threshold_seconds and request.promoted:
                app_aged.append(i)  # Store index instead of request
                
        # Promote aged CUSTOM_APP requests (in reverse to avoid index shifting)
        for i in sorted(app_aged, reverse=True):
            request = self.queues[RequestPriority.CUSTOM_APP].pop(i)
            request.priority = RequestPriority.DIRECT_API
            request.promoted = True
            request.promotion_time = datetime.utcnow()
            self.queues[RequestPriority.DIRECT_API].append(request)
    
    async def get_stats(self) -> QueueStats:
        """Get queue statistics"""
        return self.stats
    
    async def reset_stats(self) -> None:
        """Reset queue statistics"""
        self.stats = QueueStats()
    
    async def get_current_request(self) -> Optional[QueuedRequest]:
        """Get the request currently being processed, if any"""
        return self.current_request
    
    def _add_to_history(self, request: QueuedRequest) -> None:
        """Add request to history"""
        self.request_history.append(request.to_dict())
        if len(self.request_history) > self.max_history_size:
            self.request_history = self.request_history[-self.max_history_size:]
    
    def _update_stats(self, request: QueuedRequest) -> None:
        """Update statistics from completed request"""
        if not request.processing_start or not request.processing_end:
            return
            
        wait_time = (request.processing_start - request.timestamp).total_seconds()
        processing_time = (request.processing_end - request.processing_start).total_seconds()
        
        self.stats.update_timing(wait_time, processing_time)
        self.stats.completed_requests += 1
    
    def _generate_mock_response(self, request: QueuedRequest) -> Dict[str, Any]:
        """Generate a mock response for testing"""
        body = request.body
        model = body.get("model", "llama3.3:70b")
        
        # Mock Ollama/OpenAI API response format
        return {
            "id": f"mock-resp-{datetime.utcnow().timestamp()}",
            "model": model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "This is a mock response from the test environment"
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 20,
                "total_tokens": 30
            }
        }
    
    def _generate_mock_streaming_chunks(self, request: QueuedRequest) -> List[str]:
        """Generate mock streaming chunks for testing"""
        response_parts = [
            "This ", "is ", "a ", "mock ", "streaming ", "response ", 
            "from ", "the ", "test ", "environment"
        ]
        
        # Format each part as SSE data
        chunks = []
        for i, part in enumerate(response_parts):
            data = {
                "choices": [
                    {
                        "delta": {"content": part},
                        "index": 0,
                        "finish_reason": "stop" if i == len(response_parts) - 1 else None
                    }
                ],
                "model": request.body.get("model", "llama3.3:70b"),
                "id": f"mock-stream-{datetime.utcnow().timestamp()}"
            }
            chunks.append(f"data: {json.dumps(data)}\n\n")
            
        # Add final [DONE] marker
        chunks.append("data: [DONE]\n\n")
        return chunks