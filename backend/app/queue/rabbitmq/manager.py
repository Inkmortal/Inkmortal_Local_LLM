"""
RabbitMQ implementation of the queue manager.
"""

import logging
import json
from typing import Dict, Any, Optional, List, AsyncGenerator
import asyncio
import os
from dotenv import load_dotenv

from ..interface import QueueManagerInterface
from ..models import QueuedRequest, RequestPriority, QueueStats
from .connection import RabbitMQConnection
from .exchanges import ExchangeManager
from .queues import QueueManager as QueueHandler
from .aging import AgingManager
from .processor import RequestProcessor

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger("rabbitmq_manager")

# Global singleton instance
_instance = None

def get_queue_manager():
    """Get the singleton queue manager instance"""
    global _instance
    if _instance is None:
        _instance = RabbitMQManager()
    return _instance

class RabbitMQManager(QueueManagerInterface):
    """RabbitMQ implementation of queue manager"""
    
    _initialized = False
    
    def __new__(cls):
        """Ensure only one instance exists"""
        global _instance
        if _instance is None:
            _instance = super(RabbitMQManager, cls).__new__(cls)
        return _instance
    
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
        
        # Initialize processor immediately (not during connect)
        self.processor = RequestProcessor(self.ollama_url)
        
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
        
        # Set up exchanges
        main_exchange = await self.exchange_manager.declare_exchange(
            "llm_requests_exchange"
        )
        
        # Set up queues - ensure durable=True for consistency
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
        if not self.connection.is_connected:
            await self.connect()
        elif not self.exchange_manager or not self.queue_handler:
            # If connection exists but managers don't, reconnect
            await self.connect()
    
    async def close(self) -> None:
        """Close the connection"""
        if self.queue_handler:
            try:
                # Delete all queues first
                await self.queue_handler.delete_all_queues()
            except Exception as e:
                logger.warning(f"Failed to delete queues during cleanup: {e}")
        
        if self.connection:
            await self.connection.close()
            logger.info("RabbitMQ manager closed")
    
    async def add_request(self, request: QueuedRequest) -> int:
        """Add a request to the queue"""
        await self.ensure_connected()
        
        # Check if processor is initialized
        if not self.processor:
            self.processor = RequestProcessor(self.ollama_url)
            
        # Update statistics
        self.processor.stats.total_requests += 1
        
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
    
    async def process_request(self, request: QueuedRequest) -> Dict[str, Any]:
        """Process a request synchronously"""
        if not self.processor:
            self.processor = RequestProcessor(self.ollama_url)
        return await self.processor.process_request(request)
    
    async def process_streaming_request(self, request: QueuedRequest) -> AsyncGenerator[str, None]:
        """Process a request with streaming"""
        if not self.processor:
            self.processor = RequestProcessor(self.ollama_url)
        async for chunk in self.processor.process_streaming_request(request):
            yield chunk
    
    async def clear_queue(self) -> None:
        """Clear all queues"""
        await self.ensure_connected()
        await self.queue_handler.purge_all_queues()
    
    async def get_queue_size(self) -> Dict[int, int]:
        """Get size of each priority queue"""
        await self.ensure_connected()
        sizes = {}
        for priority, queue_name in self.queue_handler.queue_names.items():
            try:
                # Use passive declaration to get queue info without changing parameters
                queue_info = await self.queue_handler.channel.declare_queue(
                    queue_name,
                    passive=True  # Only check if queue exists, don't try to create/modify
                )
                sizes[priority] = queue_info.message_count
            except Exception as e:
                logger.warning(f"Error getting queue size for {queue_name}: {str(e)}")
                sizes[priority] = 0
        return sizes
    
    async def get_status(self) -> Dict[str, Any]:
        """Get current queue status"""
        await self.ensure_connected()
        sizes = await self.get_queue_size()
        
        # Check if processor exists
        if not self.processor:
            self.processor = RequestProcessor(self.ollama_url)
            
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
        # This is handled by the aging manager through RabbitMQ's dead letter exchange
        if self.aging_manager:
            logger.debug("Aging system is active")
        else:
            logger.warning("Aging manager not initialized")
    
    async def get_stats(self) -> QueueStats:
        """Get queue statistics"""
        if not self.processor:
            self.processor = RequestProcessor(self.ollama_url)
        return self.processor.stats
    
    async def reset_stats(self) -> None:
        """Reset queue statistics"""
        if not self.processor:
            self.processor = RequestProcessor(self.ollama_url)
        self.processor.stats = QueueStats()
    
    async def get_current_request(self) -> Optional[QueuedRequest]:
        """Get the request currently being processed, if any"""
        if not self.processor:
            self.processor = RequestProcessor(self.ollama_url)
        return self.processor.current_request
    
    def _add_to_history(self, request: QueuedRequest) -> None:
        """Add request to history"""
        self.request_history.append(request.to_dict())
        if len(self.request_history) > self.max_history_size:
            self.request_history = self.request_history[-self.max_history_size:]