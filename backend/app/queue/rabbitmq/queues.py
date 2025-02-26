import logging
from typing import Dict, Optional, List
import aio_pika
from aio_pika import Message, DeliveryMode

from ..models import RequestPriority

# Configure logging
logger = logging.getLogger("rabbitmq_queues")

class QueueManager:
    """Manages RabbitMQ queues"""
    
    def __init__(self, channel: aio_pika.RobustChannel):
        self.channel = channel
        self.queues: Dict[str, aio_pika.RobustQueue] = {}
        self.queue_names = {
            RequestPriority.DIRECT_API: "llm_requests_priority_1",
            RequestPriority.CUSTOM_APP: "llm_requests_priority_2",
            RequestPriority.WEB_INTERFACE: "llm_requests_priority_3"
        }
    
    async def declare_queue(
        self,
        name: str,
        durable: bool = True,
        arguments: Optional[Dict] = None
    ) -> aio_pika.RobustQueue:
        """Declare a queue"""
        if name not in self.queues:
            queue = await self.channel.declare_queue(
                name,
                durable=durable,
                arguments=arguments or {}
            )
            self.queues[name] = queue
            logger.info(f"Declared queue: {name}")
        return self.queues[name]
    
    async def setup_priority_queues(self, aging_threshold_seconds: int = 30) -> None:
        """Set up priority queues with aging"""
        for priority, queue_name in self.queue_names.items():
            await self.declare_queue(
                queue_name,
                durable=True,
                arguments={
                    "x-max-priority": 10,
                    "x-message-ttl": aging_threshold_seconds * 1000,
                    "x-queue-mode": "lazy"  # Better for long-lived messages
                }
            )
    
    async def bind_queue(
        self,
        queue_name: str,
        exchange: aio_pika.RobustExchange,
        routing_key: str = ""
    ) -> None:
        """Bind a queue to an exchange"""
        queue = await self.get_queue(queue_name)
        if not queue:
            raise ValueError(f"Queue {queue_name} does not exist")
        
        await queue.bind(
            exchange,
            routing_key=routing_key
        )
        logger.info(f"Bound queue {queue_name} to exchange {exchange.name}")
    
    async def get_queue(self, name: str) -> Optional[aio_pika.RobustQueue]:
        """Get a queue by name"""
        return self.queues.get(name)
    
    async def get_queue_size(self) -> Dict[int, int]:
        """Get the size of each priority queue"""
        result = {}
        for priority, queue_name in self.queue_names.items():
            queue = await self.get_queue(queue_name)
            if queue:
                # Get fresh declaration to get current size
                declaration = await queue.declare(passive=True)
                result[priority] = declaration.message_count
            else:
                result[priority] = 0
        return result
    
    async def purge_queue(self, name: str) -> None:
        """Purge all messages from a queue"""
        queue = await self.get_queue(name)
        if queue:
            await queue.purge()
            logger.info(f"Purged queue: {name}")
    
    async def purge_all_queues(self) -> None:
        """Purge all priority queues"""
        for queue_name in self.queue_names.values():
            await self.purge_queue(queue_name)
        logger.info("Purged all queues")
    
    async def publish_message(
        self,
        exchange: aio_pika.RobustExchange,
        routing_key: str,
        message_body: bytes,
        headers: Optional[Dict] = None
    ) -> bool:
        """
        Publish a message to an exchange.
        Returns True if message was confirmed, False otherwise.
        """
        try:
            message = Message(
                body=message_body,
                delivery_mode=DeliveryMode.PERSISTENT,
                headers=headers or {}
            )
            
            # Publish with confirmation
            await exchange.publish(
                message,
                routing_key=routing_key,
                timeout=30  # 30 second timeout for confirmation
            )
            
            logger.info(f"Published and confirmed message to exchange {exchange.name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish message: {str(e)}")
            return False
    
    async def get_next_message(
        self,
        queue_name: str,
        no_ack: bool = False
    ) -> Optional[aio_pika.IncomingMessage]:
        """Get the next message from a queue"""
        queue = await self.get_queue(queue_name)
        if queue:
            try:
                return await queue.get(no_ack=no_ack, fail=False)
            except aio_pika.exceptions.QueueEmpty:
                return None
        return None