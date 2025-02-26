import logging
import os
from typing import Optional
import aio_pika
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger("rabbitmq_connection")

class RabbitMQConnection:
    """Manages RabbitMQ connection and channel"""
    
    def __init__(self, url: Optional[str] = None):
        """Initialize connection manager"""
        self.url = url or os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost/")
        self.connection: Optional[aio_pika.RobustConnection] = None
        self.channel: Optional[aio_pika.RobustChannel] = None
    
    async def connect(self) -> None:
        """Establish connection to RabbitMQ"""
        try:
            if not self.connection or self.connection.is_closed:
                self.connection = await aio_pika.connect_robust(self.url)
                self.channel = await self.connection.channel()
                logger.info("Connected to RabbitMQ")
        except Exception as e:
            logger.error(f"Error connecting to RabbitMQ: {str(e)}")
            self.connection = None
            self.channel = None
            raise
    
    async def ensure_connected(self) -> None:
        """Ensure connection is established"""
        if not self.connection or self.connection.is_closed:
            await self.connect()
    
    async def close(self) -> None:
        """Close the connection"""
        if self.connection and not self.connection.is_closed:
            await self.connection.close()
            self.connection = None
            self.channel = None
            logger.info("RabbitMQ connection closed")
    
    @property
    def is_connected(self) -> bool:
        """Check if connection is established and open"""
        return bool(self.connection and not self.connection.is_closed)
    
    async def get_channel(self) -> aio_pika.RobustChannel:
        """Get the current channel, ensuring connection is established"""
        await self.ensure_connected()
        if not self.channel:
            raise RuntimeError("Channel not available")
        return self.channel