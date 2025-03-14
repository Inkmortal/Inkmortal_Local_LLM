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
                logger.info("CONNECTION CHECK: Already connected to RabbitMQ, using existing connection")
                return
            
            # Close any existing connection
            if self.connection and not self.connection.is_closed:
                try:
                    logger.info("CONNECTION CHECK: Closing existing connection before reconnecting")
                    await self.connection.close()
                except Exception as e:
                    logger.warning(f"Error closing existing connection: {str(e)}")
            
            try:
                logger.info(f"Connecting to RabbitMQ at {self.url}")
                
                # DETAILED DEBUG: Test if RabbitMQ server is accessible at all
                try:
                    import socket
                    import urllib.parse
                    
                    # Extract host and port from URL
                    parsed = urllib.parse.urlparse(self.url)
                    host = parsed.hostname or "localhost"
                    port = parsed.port or 5672
                    
                    # Try to create a socket connection
                    logger.info(f"CONNECTION CHECK: Testing direct connection to {host}:{port}")
                    
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(2.0)
                    result = sock.connect_ex((host, port))
                    if result == 0:
                        logger.info(f"CONNECTION CHECK: Port {port} is open on {host}")
                    else:
                        logger.error(f"CONNECTION CHECK: Port {port} is CLOSED on {host}, error code {result}")
                    sock.close()
                    
                except Exception as net_err:
                    logger.error(f"CONNECTION CHECK: Network test failed: {str(net_err)}")
                
                # Connect to RabbitMQ
                logger.info("CONNECTION: Creating robust connection to RabbitMQ")
                self.connection = await connect_robust(self.url)
                self.channel = await self.connection.channel()
                
                # DETAILED DEBUG: Verify connection and channel
                if not self.connection.is_closed:
                    logger.info("CONNECTION CHECK: Successfully established connection")
                    if not self.channel.is_closed:
                        logger.info("CONNECTION CHECK: Successfully created channel")
                    else:
                        logger.warning("CONNECTION CHECK: Channel was created but is already closed")
                else:
                    logger.warning("CONNECTION CHECK: Connection was created but is already closed")
                
                # DETAILED DEBUG: Test channel with a simple operation
                try:
                    exchange = await self.channel.declare_exchange(
                        "test_connection_exchange", 
                        aio_pika.ExchangeType.DIRECT,
                        durable=False,
                        auto_delete=True
                    )
                    logger.info("CONNECTION CHECK: Successfully declared test exchange")
                    
                    queue = await self.channel.declare_queue(
                        "test_connection_queue",
                        durable=False,
                        auto_delete=True
                    )
                    logger.info("CONNECTION CHECK: Successfully declared test queue")
                    
                    await queue.bind(exchange, routing_key="test")
                    logger.info("CONNECTION CHECK: Successfully bound test queue to test exchange")
                    
                    # Clean up
                    await queue.delete()
                    await exchange.delete()
                    logger.info("CONNECTION CHECK: Successfully cleaned up test resources")
                except Exception as test_err:
                    logger.error(f"CONNECTION CHECK: Test operations failed: {str(test_err)}")
                
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