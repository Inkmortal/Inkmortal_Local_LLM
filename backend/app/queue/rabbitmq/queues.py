import logging
from typing import Dict, Optional, List
import aio_pika
from aio_pika import Message, DeliveryMode

from ..models import RequestPriority, QueuedRequest

# Configure logging
logger = logging.getLogger("rabbitmq_queues")

class QueueManager:
    """Manages RabbitMQ queues"""
    
    def __init__(self, channel: aio_pika.RobustChannel):
        self.channel = channel
        self.queues: Dict[str, aio_pika.RobustQueue] = {}
        # Use integer values as keys instead of enum instances for consistent lookups
        self.queue_names = {
            RequestPriority.DIRECT_API.value: "llm_requests_priority_1",
            RequestPriority.CUSTOM_APP.value: "llm_requests_priority_2",
            RequestPriority.WEB_INTERFACE.value: "llm_requests_priority_3"
        }
    
    async def declare_queue(
        self,
        name: str,
        durable: bool = True,
        arguments: Optional[Dict] = None
    ) -> aio_pika.RobustQueue:
        """Declare a queue"""
        # Always use durable=True for consistency
        queue = await self.channel.declare_queue(
            name,
            durable=True,
            arguments=arguments or {}
        )
        self.queues[name] = queue
        logger.info(f"Declared queue: {name}")
        return queue
    
    async def setup_priority_queues(self, aging_threshold_seconds: int = 30) -> None:
        """Set up priority queues with aging"""
        for priority_value, queue_name in self.queue_names.items():
            # Delete queue if it exists to avoid inconsistency errors
            try:
                await self.channel.queue_delete(queue_name)
                logger.info(f"Deleted existing queue: {queue_name}")
            except Exception as e:
                logger.debug(f"Queue {queue_name} may not exist: {str(e)}")
                
            # Create a fresh queue
            await self.declare_queue(
                queue_name,
                durable=True,
                arguments={
                    "x-max-priority": 10,
                    "x-message-ttl": aging_threshold_seconds * 1000,
                    "x-dead-letter-exchange": "llm_requests_dlx",  # Add DLX
                    "x-dead-letter-routing-key": f"dl_priority_{priority_value}",  # Add DL routing key
                    "x-queue-mode": "lazy"
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
        if name not in self.queues:
            try:
                # Try to get existing queue
                queue = await self.channel.declare_queue(name, durable=True)
                self.queues[name] = queue
            except Exception as e:
                logger.error(f"Error getting queue {name}: {str(e)}")
                return None
                
        return self.queues.get(name)
    
    async def get_queue_size(self) -> Dict[int, int]:
        """Get the size of each priority queue"""
        result = {}
        for priority_value, queue_name in self.queue_names.items():
            try:
                queue = await self.get_queue(queue_name)
                if queue:
                    # Get the queue information with message count
                    try:
                        queue_info = await self.channel.declare_queue(
                            queue_name,
                            durable=True,
                            passive=True  # Just check if queue exists, don't create if not
                        )
                        
                        # Handle message count attribute safely
                        try:
                            # Try different ways to access message count based on aio_pika version
                            if hasattr(queue_info, 'message_count'):
                                result[priority_value] = queue_info.message_count
                            elif hasattr(queue_info, 'declaration_result') and hasattr(queue_info.declaration_result, 'message_count'):
                                result[priority_value] = queue_info.declaration_result.message_count
                            elif isinstance(queue_info, dict) and 'message_count' in queue_info:
                                result[priority_value] = queue_info['message_count']
                            else:
                                # If we can't determine message count, default to 0
                                logger.warning(f"Could not determine message count format for queue {queue_name}, defaulting to 0")
                                result[priority_value] = 0
                        except Exception as e:
                            logger.error(f"Error extracting message count for queue {queue_name}: {e}")
                            result[priority_value] = 0
                            
                    except Exception as e:
                        logger.error(f"Error getting message count for queue {queue_name}: {e}")
                        result[priority_value] = 0
                else:
                    result[priority_value] = 0
            except Exception as e:
                logger.error(f"Error getting queue {queue_name}: {e}")
                result[priority_value] = 0
                
        return result
    
    async def purge_queue(self, name: str) -> None:
        """Purge all messages from a queue"""
        try:
            queue = await self.get_queue(name)
            if queue:
                await queue.purge()
                logger.info(f"Purged queue: {name}")
        except Exception as e:
            logger.error(f"Error purging queue {name}: {e}")
    
    async def purge_all_queues(self) -> None:
        """Purge all priority queues"""
        for queue_name in self.queue_names.values():
            await self.purge_queue(queue_name)
        logger.info("Purged all queues")
    
    async def delete_queue(self, name: str) -> None:
        """Delete a queue"""
        try:
            await self.channel.queue_delete(name)
            if name in self.queues:
                del self.queues[name]
            logger.info(f"Deleted queue: {name}")
        except Exception as e:
            logger.warning(f"Error deleting queue {name}: {str(e)}")
    
    async def delete_all_queues(self) -> None:
        """Delete all queues"""
        for queue_name in list(self.queue_names.values()):
            await self.delete_queue(queue_name)
        logger.info("Deleted all queues")
    
    async def publish_message(
        self,
        exchange: aio_pika.RobustExchange,
        routing_key: str,
        message_body: bytes,
        headers: Optional[Dict] = None
    ) -> None:
        """Publish a message to an exchange"""
        try:
            # Enhanced logging before publishing
            logger.info(f"Preparing to publish message to exchange '{exchange.name}' with routing key '{routing_key}'")
            logger.info(f"Channel status: is_closed={self.channel.is_closed}")
            body_preview = message_body[:100].decode('utf-8', errors='replace') if message_body else 'None'
            logger.info(f"Message body preview: {body_preview}...")

            # Check if channel is closed
            if self.channel.is_closed:
                logger.warning("Channel closed, attempting to reopen")
                # Try to reacquire
                self.channel = await self.channel.connection.channel()
                logger.info("Channel reopened successfully")
                
            message = Message(
                body=message_body,
                delivery_mode=DeliveryMode.PERSISTENT,
                headers=headers or {}
            )
            
            # Log detailed info right before the publish
            logger.info(f"Publishing message to exchange '{exchange.name}' with routing key '{routing_key}', message size: {len(message_body)} bytes")
            
            # Actually publish the message
            await exchange.publish(
                message,
                routing_key=routing_key
            )
            
            # Confirm successful publish
            logger.info(f"Successfully published message to exchange '{exchange.name}' with routing key '{routing_key}'")
            
            # Log queue names and bindings
            logger.info(f"Available queues: {list(self.queues.keys())}")
        except Exception as e:
            # Enhanced error logging
            import traceback
            logger.error(f"Error publishing message: {str(e)}")
            logger.error(f"Exchange: {exchange.name}, Routing key: {routing_key}")
            logger.error(f"Exception traceback: {traceback.format_exc()}")
            raise
    
    async def get_next_message(
        self,
        queue_name: str,
        no_ack: bool = False
    ) -> Optional[aio_pika.IncomingMessage]:
        """Get the next message from a queue, with manual ack"""
        try:
            queue = await self.get_queue(queue_name)
            if queue:
                try:
                    return await queue.get(no_ack=no_ack, fail=False)
                except aio_pika.exceptions.QueueEmpty:
                    return None
            return None
        except Exception as e:
            logger.error(f"Error getting message from queue {queue_name}: {e}")
            return None