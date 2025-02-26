import logging
import json
from typing import Dict, Any
import aio_pika
from aio_pika import Message, DeliveryMode

from ..models import RequestPriority, QueuedRequest

# Configure logging
logger = logging.getLogger("rabbitmq_aging")

class AgingManager:
    """Manages request aging and promotion"""
    
    def __init__(
        self,
        channel: aio_pika.RobustChannel,
        exchange_manager,
        queue_manager
    ):
        self.channel = channel
        self.exchange_manager = exchange_manager
        self.queue_manager = queue_manager
        self.dlx_name = "llm_requests_dlx"  # Name of the dead-letter exchange
        self.dl_queues: Dict[str, aio_pika.RobustQueue] = {}
    
    async def setup_aging(self) -> None:
        """Set up dead letter exchanges and queues for aging"""
        # Set up dead letter exchange
        await self.exchange_manager.declare_exchange(
            self.dlx_name,
            type=aio_pika.ExchangeType.DIRECT,
            durable=True
        )
        
        # Set up dead letter queues for priority promotions
        self.dl_queues["3to2"] = await self.queue_manager.declare_queue(
            "llm_requests_dl_3to2",
            durable=True
        )
        await self.dl_queues["3to2"].bind(self.dlx_name, routing_key="dl_priority_3")
        
        self.dl_queues["2to1"] = await self.queue_manager.declare_queue(
            "llm_requests_dl_2to1",
            durable=True
        )
        await self.dl_queues["2to1"].bind(self.dlx_name, routing_key="dl_priority_2")
        
        # Start consumers
        await self.start_aging_consumers()
        logger.info("Set up request aging system")
    
    async def start_aging_consumers(self) -> None:
        """Start consumers for dead letter queues"""
        await self.dl_queues["3to2"].consume(self.handle_3to2_promotion)
        await self.dl_queues["2to1"].consume(self.handle_2to1_promotion)
        logger.info("Started aging consumers")
    
    async def handle_3to2_promotion(self, message: aio_pika.IncomingMessage) -> None:
        """Handle promotion from priority 3 to 2"""
        async with message.process():  # Automatically acknowledges
            try:
                request_dict = json.loads(message.body.decode())
                request = QueuedRequest.from_dict(request_dict)
                
                # Update priority
                request.priority = RequestPriority.CUSTOM_APP
                request.promoted = True
                
                # Republish with new priority
                await self.queue_manager.publish_message(
                    await self.exchange_manager.get_exchange("llm_requests_exchange"),
                    f"priority_{request.priority}",
                    json.dumps(request.to_dict()).encode(),
                    {"x-original-priority": request.original_priority}
                )
                logger.info(f"Promoted request {request.body} from WEB_INTERFACE to CUSTOM_APP")
            
            except Exception as e:
                logger.error(f"Error handling 3->2 promotion: {str(e)}")
                await message.reject(requeue=False) # Reject to prevent infinite loop
    
    async def handle_2to1_promotion(self, message: aio_pika.IncomingMessage) -> None:
        """Handle promotion from priority 2 to 1"""
        async with message.process():  # Automatically acknowledges
            try:
                request_dict = json.loads(message.body.decode())
                request = QueuedRequest.from_dict(request_dict)
                
                # Update priority
                request.priority = RequestPriority.DIRECT_API
                request.promoted = True
                
                # Republish with new priority
                await self.queue_manager.publish_message(
                    await self.exchange_manager.get_exchange("llm_requests_exchange"),
                    f"priority_{request.priority}",
                    json.dumps(request.to_dict()).encode(),
                    {"x-original-priority": request.original_priority}
                )
                logger.info(f"Promoted request {request.body} from CUSTOM_APP to DIRECT_API")
            
            except Exception as e:
                logger.error(f"Error handling 2->1 promotion: {str(e)}")
                await message.reject(requeue=False) # Reject to prevent infinite loop