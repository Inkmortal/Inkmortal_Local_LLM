import logging
import json
from typing import Dict, Any, Optional, List
import asyncio
import os
from dotenv import load_dotenv

from ..base import QueueManager as BaseQueueManager
from ..models import QueuedRequest, RequestPriority
from .connection import RabbitMQConnection
from .exchanges import ExchangeManager
from .queues import QueueManager as QueueHandler
from .aging import AgingManager
from .processor import RequestProcessor

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
        self.processor = None
        
        # Request tracking
        self.request_history: List[Dict[str, Any]] = []
        self.max_history_size = 100
        
        # Aging configuration
        self._aging_threshold_seconds = int(os.getenv("AGING_THRESHOLD_SECONDS", "30"))
        
        self._initialized = True
        logger.info("RabbitMQ Manager initialized")
    
    @property
    def aging_threshold_seconds(self) -> int:
        """Get aging threshold in seconds"""
        return self._aging_threshold_seconds
    
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
        self.processor = RequestProcessor(self.ollama_url)
        
        # Set up exchanges
        main_exchange = await self.exchange_manager.declare_exchange(
            "llm_requests_exchange"
        )
        
        # Set up queues
        await self.queue_handler.setup_priority_queues(self._aging_threshold_seconds)
        
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
        if self.queue_handler:
            try:
                # Delete all queues first
                await self.queue_handler.delete_all_queues()
            except:
                logger.warning("Failed to delete queues during cleanup")
        
        await self.connection.close()
        logger.info("RabbitMQ manager closed")
    
    async def add_request(self, request: QueuedRequest) -> int:
        """Add a request to the queue"""
        await self.ensure_connected()
        
        # Update statistics
        await self.processor.stats.total_requests += 1
        
        # Publish request
        exchange = await self.exchange_manager.get_exchange("llm_requests_exchange")
        if not exchange:
            raise RuntimeError("Main exchange not found")
        
        # Publish message
        await self.queue_handler.publish_message(
            exchange,
            f"priority_{request.priority}",
            json.dumps(request.to_dict()).encode(),
            {"x-original-priority": request.original_priority}
        )
        
        # Small delay to ensure message is queued
        await asyncio.sleep(0.1)
        
        # Get queue position (approximate)
        sizes = await self.get_queue_size()
        position = 0
        for p in sorted(RequestPriority):
            if p < request.priority:
                position += sizes.get(p, 0)
            elif p == request.priority:
                position += sizes.get(p, 0) - 1 # Decrement to account for this new message
        
        return position
    
    async def get_next_request(self) -> Optional[QueuedRequest]:
        """Get next request from highest priority non-empty queue"""
        await self.ensure_connected()
        
        for priority in sorted(RequestPriority):
            queue_name = self.queue_handler.queue_names[priority]
            message = await self.queue_handler.get_next_message(queue_name)
            
            if message:
                request_dict = json.loads(message.body.decode())
                # Acknowledge message
                await message.ack()
                return QueuedRequest.from_dict(request_dict)
        
        return None
    
    async def clear_queue(self) -> None:
        """Clear all queues"""
        await self.ensure_connected()
        await self.queue_handler.purge_all_queues()
    
    async def get_queue_size(self) -> Dict[int, int]:
        """Get size of each priority queue"""
        await self.ensure_connected()
        sizes = {}
        for priority, queue_name in self.queue_handler.queue_names.items():
            queue = await self.queue_handler.get_queue(queue_name)
            if queue:
                # Use declare with passive=True to get current size
                declaration = await queue.declare(passive=True)
                sizes[priority] = declaration.message_count
            else:
                sizes[priority] = 0
        return sizes
    
    async def get_status(self) -> Dict[str, Any]:
        """Get current queue status"""
        await self.ensure_connected()
        sizes = await self.get_queue_size()
        
        return {
            "queue_size": sum(sizes.values()),
            "queue_by_priority": sizes,
            "current_request": self.processor.current_request.to_dict() if self.processor.current_request else None,
            "stats": self.processor.stats.to_dict(),
            "rabbitmq_connected": self.connection.is_connected
        }
    
    def get_history(self) -> List[Dict[str, Any]]:
        """Get request history"""
        return self.request_history
    
    async def promote_request(self, request: QueuedRequest, new_priority: int) -> None:
        """Promote a request to higher priority"""
        if new_priority >= request.priority:
            raise ValueError("New priority must be higher (lower number)")
        
        # Get the original message
        queue_name = self.queue_handler.queue_names[request.priority]
        message = await self.queue_handler.get_next_message(queue_name, no_ack=False)

        if message:
            # Update priority in message body
            request_dict = json.loads(message.body.decode())
            request_dict["priority"] = new_priority
            request_dict["promoted"] = True

            # Republish with new priority
            await self.add_request(QueuedRequest.from_dict(request_dict))

            # Acknowledge original message
            await message.ack()
            logger.info(f"Promoted request from {request.priority} to {new_priority}")
        else:
            logger.warning(f"Could not find message to promote in queue {queue_name}")

    
    async def handle_request_aging(self) -> None:
        """Handle request aging (managed by aging system)"""
        pass
    
    async def get_stats(self) -> QueueStats:
        """Get queue statistics"""
        return await self.processor.get_stats()
    
    async def reset_stats(self) -> None:
        """Reset queue statistics"""
        await self.processor.reset_stats()
    
    def _add_to_history(self, request: QueuedRequest) -> None:
        """Add request to history"""
        self.request_history.append(request.to_dict())
        if len(self.request_history) > self.max_history_size:
            self.request_history = self.request_history[-self.max_history_size:]