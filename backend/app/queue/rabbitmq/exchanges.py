import logging
from typing import Dict, Optional
import aio_pika
from aio_pika import ExchangeType

# Configure logging
logger = logging.getLogger("rabbitmq_exchanges")

class ExchangeManager:
    """Manages RabbitMQ exchanges"""
    
    def __init__(self, channel: aio_pika.RobustChannel):
        self.channel = channel
        self.exchanges: Dict[str, aio_pika.RobustExchange] = {}
    
    async def declare_exchange(
        self,
        name: str,
        type: ExchangeType = ExchangeType.DIRECT,
        durable: bool = True
    ) -> aio_pika.RobustExchange:
        """Declare an exchange"""
        if name not in self.exchanges:
            exchange = await self.channel.declare_exchange(
                name,
                type=type,
                durable=durable
            )
            self.exchanges[name] = exchange
            logger.info(f"Declared exchange: {name}")
        return self.exchanges[name]
    
    async def get_exchange(self, name: str) -> Optional[aio_pika.RobustExchange]:
        """Get an exchange by name"""
        return self.exchanges.get(name)
    
    async def bind_exchange(
        self,
        source: str,
        destination: str,
        routing_key: str = ""
    ) -> None:
        """Bind two exchanges"""
        source_exchange = await self.get_exchange(source)
        dest_exchange = await self.get_exchange(destination)
        
        if not source_exchange or not dest_exchange:
            raise ValueError("Both exchanges must exist")
        
        await dest_exchange.bind(
            source_exchange,
            routing_key=routing_key
        )
        logger.info(f"Bound exchange {source} to {destination} with key {routing_key}")
    
    async def setup_dlx(self, name: str) -> aio_pika.RobustExchange:
        """Set up a dead letter exchange"""
        dlx = await self.declare_exchange(
            f"{name}_dlx",
            type=ExchangeType.DIRECT,
            durable=True
        )
        logger.info(f"Set up dead letter exchange: {name}_dlx")
        return dlx