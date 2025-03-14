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
        try:
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
            
            # Bind queues to exchange using priority values, not enum instances
            for priority in RequestPriority:
                priority_value = priority.value
                queue_name = self.queue_handler.queue_names.get(priority_value)
                if not queue_name:
                    logger.warning(f"No queue name found for priority value {priority_value}")
                    continue
                    
                # Use priority.value to ensure we bind with integer values consistently 
                routing_key = f"priority_{priority_value}"
                logger.info(f"Binding queue {queue_name} to exchange with routing key: {routing_key}")
                await self.queue_handler.bind_queue(
                    queue_name,
                    main_exchange,
                    routing_key
                )
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            # Reset connection and managers on failure
            self.connection._is_connected = False
            self.exchange_manager = None
            self.queue_handler = None
            self.aging_manager = None
            # Re-raise for proper handling
            raise
    
    async def ensure_connected(self) -> None:
        """Ensure connection is established"""
        try:
            if not self.connection.is_connected:
                await self.connect()
            elif not self.exchange_manager or not self.queue_handler:
                # If connection exists but managers don't, reconnect
                await self.connect()
        except Exception as e:
            logger.error(f"Failed to establish RabbitMQ connection: {e}")
            # Don't raise - this allows the admin panel to work even without RabbitMQ
    
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
        try:
            print(f"RabbitMQ add_request called: endpoint={request.endpoint}, priority={request.priority}")
            logger.info(f"Adding request to queue - type: {type(request)}, endpoint: {request.endpoint}")
            
            # Debug log the request priority type and value
            if hasattr(request.priority, 'value'):
                logger.info(f"Request priority is enum type: {type(request.priority)}, value: {request.priority.value}, name: {request.priority.name}")
            else:
                logger.info(f"Request priority is not enum type: {type(request.priority)}, value: {request.priority}")
                
            await self.ensure_connected()
            
            # Check if processor is initialized
            if not self.processor:
                self.processor = RequestProcessor(self.ollama_url)
                
            # Update statistics
            self.processor.stats.total_requests += 1
            
            # Debug log connection status
            logger.info(f"Connection status: {self.connection.is_connected}")
            logger.info(f"Exchange manager initialized: {self.exchange_manager is not None}")
            logger.info(f"Queue handler initialized: {self.queue_handler is not None}")
            
            # Publish request
            exchange = await self.exchange_manager.get_exchange("llm_requests_exchange")
            if not exchange:
                raise RuntimeError("Main exchange not found")
            
            # Get the integer value of the priority correctly
            priority_value = request.priority.value if hasattr(request.priority, 'value') else request.priority
            
            # Prepare routing key that exactly matches binding format
            routing_key = f"priority_{priority_value}"
            logger.info(f"Publishing message with routing key: '{routing_key}', priority: {request.priority}, priority value: {priority_value}")
            
            # Log queue names to verify routing will work
            logger.info(f"Available queue names: {self.queue_handler.queue_names}")
            
            # Generate a unique identifier for this request to check for duplicates
            request_id = f"{request.timestamp.timestamp()}-{request.user_id}"
            
            # Import processed_requests from consumer to check for duplicates
            from ..consumer import processed_requests
            if request_id in processed_requests:
                logger.warning(f"Request {request_id} is already being processed, skipping")
                return -2  # Special return code for already being processed
                
            # Use priority_value as the key for queue_names, not the enum instance
            target_queue = self.queue_handler.queue_names.get(priority_value)
            logger.info(f"Target queue for priority {request.priority} is: {target_queue}, routing key={routing_key}")
            
            # Publish message with extra logging
            logger.info(f"About to publish message with routing_key={routing_key} to exchange {exchange.name}")
            try:
                await self.queue_handler.publish_message(
                    exchange,
                    routing_key,
                    json.dumps(request.to_dict()).encode(),
                    {"x-original-priority": request.original_priority}
                )
                logger.info(f"Message published successfully with routing_key={routing_key}")
            except Exception as e:
                logger.error(f"Error publishing message: {e}")
                raise
            
            # Small delay to ensure message is queued
            await asyncio.sleep(0.1)
            
            # Check queue sizes after publishing to verify the message went through
            new_sizes = await self.get_queue_size()
            logger.info(f"Queue sizes after publishing: {new_sizes}")
            
            # DETAILED DEBUG: Verify if message exists in queue
            try:
                # Check if message was actually added by examining the queue
                queue_name = self.queue_handler.queue_names.get(priority_value)
                queue = await self.queue_handler.get_queue(queue_name)
                if queue:
                    message = await queue.get(no_ack=False)
                    if message:
                        logger.info(f"QUEUE VERIFICATION: Successfully found message in queue {queue_name}")
                        # Put it back
                        await message.reject(requeue=True)
                    else:
                        logger.warning(f"QUEUE VERIFICATION: No message found in queue {queue_name} immediately after publishing")
            except Exception as e:
                logger.error(f"QUEUE VERIFICATION ERROR: {str(e)}")
                # Continue anyway, don't block the main flow
            
            # Get queue position (approximate)
            sizes = await self.get_queue_size()
            position = 0
            
            # Get priority value from request
            req_priority_value = request.priority.value if hasattr(request.priority, 'value') else request.priority
            
            for p in sorted(RequestPriority):
                p_value = p.value
                if p_value < req_priority_value:
                    position += sizes.get(p_value, 0)
                elif p_value == req_priority_value:
                    position += sizes.get(p_value, 0) - 1 # Decrement to account for this new message
            
            return position
        except Exception as e:
            # Enhanced error logging with stack trace
            import traceback
            logger.error(f"Error adding request to queue: {e}")
            logger.error(f"Request details: endpoint={request.endpoint}, user_id={request.user_id}, priority={request.priority}")
            logger.error(f"Exception traceback: {traceback.format_exc()}")
            return -1  # Return -1 to indicate an error
    
    async def get_next_request(self) -> Optional[QueuedRequest]:
        """Get next request from highest priority non-empty queue"""
        try:
            await self.ensure_connected()
            
            for priority in sorted(RequestPriority):
                priority_value = priority.value
                queue_name = self.queue_handler.queue_names.get(priority_value)
                if not queue_name:
                    logger.warning(f"No queue found for priority value {priority_value}")
                    continue
                
                message = await self.queue_handler.get_next_message(queue_name)
                
                if message:
                    logger.info(f"Retrieved message from queue '{queue_name}' with priority {priority.name}")
                    
                    try:
                        # Parse as JSON
                        request_dict = json.loads(message.body.decode())
                        
                        # Acknowledge message
                        await message.ack()
                        
                        return QueuedRequest.from_dict(request_dict)
                    except json.JSONDecodeError as e:
                        logger.error(f"Error parsing message as JSON: {e}")
                        # Acknowledge to avoid blocking the queue, even though we can't process it
                        await message.ack()
                        logger.warning(f"Acknowledged unparseable message from queue '{queue_name}'")
            
            # No messages found
            return None
        except Exception as e:
            logger.error(f"Error getting next request: {e}")
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
        try:
            await self.ensure_connected()
            await self.queue_handler.purge_all_queues()
        except Exception as e:
            logger.error(f"Error clearing queues: {e}")
    
    async def get_queue_size(self) -> Dict[int, int]:
        """Get size of each priority queue"""
        try:
            await self.ensure_connected()
            if not self.queue_handler:
                return {p: 0 for p in RequestPriority}
                
            return await self.queue_handler.get_queue_size()
        except Exception as e:
            logger.error(f"Error getting queue sizes: {e}")
            return {p: 0 for p in RequestPriority}
    
    async def get_status(self) -> Dict[str, Any]:
        """Get current queue status"""
        try:
            try:
                await self.ensure_connected()
                sizes = await self.get_queue_size()
            except Exception as e:
                logger.error(f"Error connecting to RabbitMQ: {e}")
                sizes = {p: 0 for p in RequestPriority}
            
            # Check if processor exists
            if not self.processor:
                self.processor = RequestProcessor(self.ollama_url)
                
            # Check Ollama connection
            ollama_connected = await self._check_ollama_connection()
                
            return {
                "queue_size": sum(sizes.values()),
                "queue_by_priority": sizes,
                "current_request": self.processor.current_request.to_dict() if self.processor.current_request else None,
                "stats": self.processor.stats.to_dict(),
                "rabbitmq_connected": self.connection.is_connected,
                "ollama_connected": ollama_connected,
                "total_requests": self.processor.stats.total_requests,
                "processing": 1 if self.processor.current_request else 0
            }
        except Exception as e:
            logger.error(f"Error getting queue status: {e}")
            return {
                "queue_size": 0,
                "queue_by_priority": {p: 0 for p in RequestPriority},
                "current_request": None,
                "stats": QueueStats().to_dict(),
                "rabbitmq_connected": False,
                "ollama_connected": False,
                "total_requests": 0,
                "processing": 0
            }
            
    async def _check_ollama_connection(self) -> bool:
        """Check if Ollama API is reachable"""
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await asyncio.wait_for(
                    client.get(f"{self.ollama_url}/api/tags"),
                    timeout=2.0
                )
                # Only log error if connection actually failed
                if response.status_code != 200:
                    logger.error(f"Ollama connection check failed with status code: {response.status_code}")
                return response.status_code == 200
        except asyncio.TimeoutError:
            logger.error("Ollama connection check timed out after 2 seconds")
            return False
        except httpx.RequestError as e:
            logger.error(f"Ollama connection check failed with request error: {e}")
            return False
        except Exception as e:
            logger.error(f"Ollama connection check failed with unexpected error: {e}")
            return False
    
    def get_history(self) -> List[Dict[str, Any]]:
        """Get request history"""
        try:
            # Try to import from the consumer which has actual history
            from ..consumer import get_request_history
            return get_request_history()
        except ImportError:
            logger.warning("Could not import get_request_history from consumer module")
            # Fall back to empty history
            return []
    
    async def promote_request(self, request: QueuedRequest, new_priority: int) -> None:
        """Promote a request to higher priority"""
        try:
            # Get priority value from request
            req_priority_value = request.priority.value if hasattr(request.priority, 'value') else request.priority
            
            if new_priority >= req_priority_value:
                raise ValueError("New priority must be higher (lower number)")
            
            # Get the original message using priority value as key
            queue_name = self.queue_handler.queue_names.get(req_priority_value)
            if not queue_name:
                logger.error(f"No queue found for priority value {req_priority_value}")
                return
                
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
        except Exception as e:
            logger.error(f"Error promoting request: {e}")
    
    # Note: Request aging is automatically handled by RabbitMQ's TTL and dead letter exchange mechanisms.
    # The aging.py module sets up the necessary infrastructure for automatic promotion of aged messages.
    # No manual intervention or periodic calls are needed - the system handles aging on its own.
    
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
    
    async def get_position(self, request: QueuedRequest) -> Optional[int]:
        """Get the position of a request in the queue, or None if not in queue"""
        try:
            await self.ensure_connected()
            
            # Check if this is the current request being processed
            current = self.processor.current_request
            if current and current.timestamp == request.timestamp:
                return 0
                
            # Get queue statistics for all priority levels
            queue_sizes = await self.get_queue_size()
            
            # We can only provide an estimated position since RabbitMQ doesn't easily allow 
            # searching for a specific message in a queue without consuming it
            position = 1  # Start at 1 since position 0 is the currently processing request
            
            # Get the priority value from the request
            req_priority_value = request.priority.value if hasattr(request.priority, 'value') else request.priority
            
            # Add count of all higher priority queues
            for priority in sorted(RequestPriority):
                priority_value = priority.value
                if priority_value < req_priority_value:
                    position += queue_sizes.get(priority_value, 0)
            
            # For the same priority level, we can only approximate
            # We assume the request is halfway through its own priority queue
            same_priority_count = queue_sizes.get(req_priority_value, 0)
            if same_priority_count > 0:
                position += same_priority_count // 2
            
            return position
        except Exception as e:
            logger.error(f"Error getting queue position: {str(e)}")
            return None
    
    async def handle_request_aging(self) -> None:
        """
        Handle aging of requests in queues.
        
        Note: Request aging is automatically handled by RabbitMQ's TTL and dead letter exchange mechanisms.
        The aging.py module sets up the necessary infrastructure for automatic promotion of aged messages.
        No manual intervention or periodic calls are needed - the system handles aging on its own.
        """
        # No implementation needed as RabbitMQ handles aging automatically
        pass
    
    def _add_to_history(self, request: QueuedRequest) -> None:
        """Add request to history"""
        self.request_history.append(request.to_dict())
        if len(self.request_history) > self.max_history_size:
            self.request_history = self.request_history[-self.max_history_size:]