import logging
import json
from typing import Dict, Any, Optional, AsyncGenerator, List
import asyncio
import httpx
import os
from dotenv import load_dotenv

from ..base import QueueManager as BaseQueueManager
from ..models import QueuedRequest, QueueStats, RequestPriority
from .connection import RabbitMQConnection
from .exchanges import ExchangeManager
from .queues import QueueManager as QueueHandler
from .aging import AgingManager

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger("rabbitmq_manager")

class RabbitMQManager(BaseQueueManager):
    """RabbitMQ implementation of queue manager"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """Ensure only one instance exists"""
        if cls._instance is None:
            cls._instance = super(RabbitMQManager, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize the manager"""
        if self._initialized:
            return
        
        # Get Ollama API URL
        self.ollama_url = os.getenv("OLLAMA_API_URL", "http://localhost:11434")
        
        # Initialize components
        self.connection = RabbitMQConnection()
        self.exchange_manager = None
        self.queue_handler = None
        self.aging_manager = None
        
        # Request tracking
        self.current_request = None
        self.request_history: List[Dict[str, Any]] = []
        self.max_history_size = 100
        
        # Statistics
        self.stats = QueueStats()
        
        self._initialized = True
        logger.info("RabbitMQ Manager initialized")
    
    async def connect(self) -> None:
        """Connect and set up RabbitMQ infrastructure"""
        await self.connection.connect()
        channel = await self.connection.get_channel()
        
        # Initialize managers
        self.exchange_manager = ExchangeManager(channel)
        self.queue_handler = QueueHandler(channel)
        self.aging_manager = AgingManager(
            channel,
            self.exchange_manager,
            self.queue_handler
        )
        
        # Set up exchanges
        main_exchange = await self.exchange_manager.declare_exchange(
            "llm_requests_exchange"
        )
        
        # Set up queues
        await self.queue_handler.setup_priority_queues()
        
        # Set up aging system
        await self.aging_manager.setup_aging()
        
        # Bind queues to exchange
        for priority in RequestPriority:
            queue_name = self.queue_handler.queue_names[priority]
            await self.queue_handler.bind_queue(
                queue_name,
                main_exchange,
                f"priority_{priority}"
            )
    
    async def ensure_connected(self) -> None:
        """Ensure connection is established"""
        await self.connection.ensure_connected()
    
    async def close(self) -> None:
        """Close the connection"""
        await self.connection.close()
    
    async def add_request(self, request: QueuedRequest) -> int:
        """Add a request to the queue"""
        await self.ensure_connected()
        
        # Update statistics
        self.stats.total_requests += 1
        
        # Publish request
        exchange = await self.exchange_manager.get_exchange("llm_requests_exchange")
        if not exchange:
            raise RuntimeError("Main exchange not found")
        
        await self.queue_handler.publish_message(
            exchange,
            f"priority_{request.priority}",
            json.dumps(request.to_dict()).encode(),
            {"x-original-priority": request.original_priority}
        )
        
        # Get queue position
        sizes = await self.get_queue_size()
        position = 0
        for p in sorted(RequestPriority):
            if p < request.priority:
                position += sizes.get(p, 0)
            elif p == request.priority:
                position += sizes.get(p, 0) - 1
        
        return position
    
    async def get_next_request(self) -> Optional[QueuedRequest]:
        """Get next request from highest priority non-empty queue"""
        await self.ensure_connected()
        
        for priority in sorted(RequestPriority):
            queue_name = self.queue_handler.queue_names[priority]
            message = await self.queue_handler.get_next_message(queue_name)
            
            if message:
                request_dict = json.loads(message.body.decode())
                return QueuedRequest.from_dict(request_dict)
        
        return None
    
    async def process_request(self, request: QueuedRequest) -> Dict[str, Any]:
        """Process a request synchronously"""
        while True:
            if self.current_request is None:
                next_request = await self.get_next_request()
                if next_request and next_request.timestamp == request.timestamp:
                    self.current_request = next_request
                    self.current_request.status = "processing"
                    break
            await asyncio.sleep(0.1)
        
        try:
            # Forward to Ollama
            endpoint = request.endpoint.replace("/api", "")
            url = f"{self.ollama_url}{endpoint}"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json=request.body,
                    timeout=60.0
                )
                
                # Update request status
                self.current_request.status = "completed"
                
                # Update statistics
                self._update_stats(self.current_request)
                
                # Add to history
                self._add_to_history(self.current_request)
                
                # Clear current request
                self.current_request = None
                
                return response.json()
        
        except Exception as e:
            if self.current_request:
                self.current_request.status = "failed"
                self.current_request.error = str(e)
                self.stats.failed_requests += 1
                self._add_to_history(self.current_request)
                self.current_request = None
            
            raise
    
    async def process_streaming_request(
        self,
        request: QueuedRequest
    ) -> AsyncGenerator[str, None]:
        """Process a streaming request"""
        while True:
            if self.current_request is None:
                next_request = await self.get_next_request()
                if next_request and next_request.timestamp == request.timestamp:
                    self.current_request = next_request
                    self.current_request.status = "processing"
                    break
            await asyncio.sleep(0.1)
        
        try:
            endpoint = request.endpoint.replace("/api", "")
            url = f"{self.ollama_url}{endpoint}"
            
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST",
                    url,
                    json=request.body,
                    timeout=300.0
                ) as response:
                    async for chunk in response.aiter_text():
                        yield chunk
                
                # Update request status
                self.current_request.status = "completed"
                
                # Update statistics
                self._update_stats(self.current_request)
                
                # Add to history
                self._add_to_history(self.current_request)
                
                # Clear current request
                self.current_request = None
        
        except Exception as e:
            if self.current_request:
                self.current_request.status = "failed"
                self.current_request.error = str(e)
                self.stats.failed_requests += 1
                self._add_to_history(self.current_request)
                self.current_request = None
            
            yield json.dumps({"error": str(e)})
    
    async def clear_queue(self) -> None:
        """Clear all queues"""
        await self.ensure_connected()
        await self.queue_handler.purge_all_queues()
    
    async def get_queue_size(self) -> Dict[int, int]:
        """Get size of each priority queue"""
        await self.ensure_connected()
        return await self.queue_handler.get_queue_size()
    
    async def get_status(self) -> Dict[str, Any]:
        """Get current queue status"""
        try:
            await self.ensure_connected()
            sizes = await self.get_queue_size()
        except:
            sizes = {p: 0 for p in RequestPriority}
        
        return {
            "queue_size": sum(sizes.values()),
            "queue_by_priority": sizes,
            "current_request": self.current_request.to_dict() if self.current_request else None,
            "stats": self.stats.to_dict(),
            "rabbitmq_connected": self.connection.is_connected
        }
    
    def get_history(self) -> List[Dict[str, Any]]:
        """Get request history"""
        return self.request_history
    
    async def promote_request(self, request: QueuedRequest, new_priority: int) -> None:
        """Promote a request to higher priority"""
        if new_priority >= request.priority:
            raise ValueError("New priority must be higher (lower number)")
        
        request.priority = new_priority
        request.promoted = True
        
        await self.add_request(request)
    
    async def handle_request_aging(self) -> None:
        """Handle request aging (managed by aging system)"""
        pass
    
    async def get_stats(self) -> QueueStats:
        """Get queue statistics"""
        return self.stats
    
    async def reset_stats(self) -> None:
        """Reset queue statistics"""
        self.stats = QueueStats()
    
    def _update_stats(self, request: QueuedRequest) -> None:
        """Update statistics from completed request"""
        if not request.processing_start or not request.processing_end:
            return
        
        wait_time = (request.processing_start - request.timestamp).total_seconds()
        processing_time = (request.processing_end - request.processing_start).total_seconds()
        
        self.stats.update_timing(wait_time, processing_time)
    
    def _add_to_history(self, request: QueuedRequest) -> None:
        """Add request to history"""
        self.request_history.append(request.to_dict())
        if len(self.request_history) > self.max_history_size:
            self.request_history = self.request_history[-self.max_history_size:]