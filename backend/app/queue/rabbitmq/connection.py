import logging
import os
import asyncio
from typing import Optional, Dict, Any
import aio_pika
from aio_pika import connect_robust
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger("rabbitmq_connection")

class RabbitMQConnection:
    """Handles RabbitMQ connection"""
    
    def __init__(self):
        self.url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost/")
        self.connection: Optional[aio_pika.RobustConnection] = None
        self.channel: Optional[aio_pika.RobustChannel] = None
        self._is_connected = False
        self.lock = asyncio.Lock()  # Add a lock for thread safety
    
    @property
    def is_connected(self) -> bool:
        """Check if connected"""
        if not self.connection or not self.channel:
            return False
        return self._is_connected and not self.connection.is_closed
    
    async def connect(self) -> None:
        """Connect to RabbitMQ"""
        async with self.lock:  # Use lock to prevent concurrent connections
            if self.is_connected:
                logger.info("Already connected to RabbitMQ")
                return
            
            # Close any existing connection
            if self.connection and not self.connection.is_closed:
                try:
                    await self.connection.close()
                except Exception as e:
                    logger.warning(f"Error closing existing connection: {str(e)}")
            
            try:
                logger.info(f"Connecting to RabbitMQ at {self.url}")
                self.connection = await connect_robust(self.url)
                self.channel = await self.connection.channel()
                self._is_connected = True
                logger.info("Connected to RabbitMQ")
            except Exception as e:
                self._is_connected = False
                logger.error(f"Failed to connect to RabbitMQ: {str(e)}")
                raise
    
    async def get_channel(self) -> aio_pika.RobustChannel:
        """Get channel, reconnecting if needed"""
        if not self.is_connected or self.channel.is_closed:
            await self.connect()
        return self.channel
    
    async def ensure_connected(self) -> None:
        """Ensure connection is established"""
        if not self.is_connected:
            await self.connect()
        elif self.channel.is_closed:
            # Reopen channel if closed
            try:
                self.channel = await self.connection.channel()
            except Exception as e:
                logger.error(f"Failed to reopen channel: {str(e)}")
                await self.connect()  # Full reconnect if channel opening fails
    
    async def close(self) -> None:
        """Close the connection"""
        async with self.lock:
            if self.connection:
                try:
                    logger.info("Closing RabbitMQ connection")
                    await self.connection.close()
                    self._is_connected = False
                    self.connection = None
                    self.channel = None
                    logger.info("RabbitMQ connection closed")
                except Exception as e:
                    logger.error(f"Error closing RabbitMQ connection: {str(e)}")
                    # Reset connection anyway
                    self._is_connected = False
                    self.connection = None
                    self.channel = None