import asyncio
import json
import time
import os
import enum
import logging
from typing import Dict, List, Any, Optional, AsyncGenerator
from datetime import datetime, timedelta
import aio_pika
from aio_pika import Message, DeliveryMode, ExchangeType
from fastapi import HTTPException
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Ollama API URL from environment or use default
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434")

# Get RabbitMQ URL from environment or use default
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost/")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rabbitmq_manager")

class RequestPriority(enum.IntEnum):
    """Priority levels for requests"""
    DIRECT_API = 1  # Highest priority (direct API access)
    CUSTOM_APP = 2  # Medium priority (custom applications)
    WEB_INTERFACE = 3  # Lowest priority (web interface)

class RabbitMQManager:
    """
    Manages a priority-based queue for LLM requests using RabbitMQ.
    Implements the Singleton pattern to ensure only one manager exists.
    """
    _instance = None
    
    def __new__(cls):
        """Ensure only one instance of RabbitMQManager exists"""
        if cls._instance is None:
            cls._instance = super(RabbitMQManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize the queue manager if not already initialized"""
        if self._initialized:
            return
        
        # Connection and channel will be set in connect()
        self.connection = None
        self.channel = None
        
        # Queue names for each priority level
        self.queue_names = {
            RequestPriority.DIRECT_API: "llm_requests_priority_1",
            RequestPriority.CUSTOM_APP: "llm_requests_priority_2",
            RequestPriority.WEB_INTERFACE: "llm_requests_priority_3"
        }
        
        # Exchange name
        self.exchange_name = "llm_requests_exchange"
        
        # Currently processing request
        self.current_request = None
        
        # Request history for monitoring
        self.request_history = []
        self.max_history_size = 100
        
        # Statistics
        self.stats = {
            "total_requests": 0,
            "completed_requests": 0,
            "failed_requests": 0,
            "avg_wait_time": 0,
            "avg_processing_time": 0
        }
        
        # Aging configuration
        self.aging_threshold_seconds = 30  # Time before aging kicks in
        
        # Mark as initialized
        self._initialized = True
        
        # Start connection
        asyncio.create_task(self.connect())
        
        logger.info("RabbitMQ Manager initialized")
    
    async def connect(self):
        """Connect to RabbitMQ and set up exchanges and queues"""
        try:
            # Connect to RabbitMQ
            self.connection = await aio_pika.connect_robust(RABBITMQ_URL)
            self.channel = await self.connection.channel()
            
            # Declare exchange
            self.exchange = await self.channel.declare_exchange(
                self.exchange_name,
                ExchangeType.DIRECT,
                durable=True
            )
            
            # Declare queues for each priority level
            for priority, queue_name in self.queue_names.items():
                queue = await self.channel.declare_queue(
                    queue_name,
                    durable=True,
                    arguments={
                        "x-max-priority": 10,  # Allow for priority within queues
                        "x-message-ttl": self.aging_threshold_seconds * 1000  # TTL in milliseconds
                    }
                )
                
                # Bind queue to exchange with routing key based on priority
                await queue.bind(
                    self.exchange,
                    routing_key=f"priority_{priority}"
                )
            
            # Declare dead-letter exchange and queue for aging
            self.dlx = await self.channel.declare_exchange(
                "llm_requests_dlx",
                ExchangeType.DIRECT,
                durable=True
            )
            
            # Dead-letter queue for priority 3 -> 2 promotion
            self.dl_queue_3to2 = await self.channel.declare_queue(
                "llm_requests_dl_3to2",
                durable=True
            )
            await self.dl_queue_3to2.bind(self.dlx, routing_key="dl_priority_3")
            
            # Dead-letter queue for priority 2 -> 1 promotion
            self.dl_queue_2to1 = await self.channel.declare_queue(
                "llm_requests_dl_2to1",
                durable=True
            )
            await self.dl_queue_2to1.bind(self.dlx, routing_key="dl_priority_2")
            
            # Start consumers for dead-letter queues (for aging)
            await self.start_aging_consumers()
            
            logger.info("Connected to RabbitMQ and set up exchanges and queues")
        
        except Exception as e:
            logger.error(f"Error connecting to RabbitMQ: {str(e)}")
            # Retry connection after delay
            await asyncio.sleep(5)
            asyncio.create_task(self.connect())
    
    async def start_aging_consumers(self):
        """Start consumers for dead-letter queues to handle request aging"""
        # Consumer for priority 3 -> 2 promotion
        await self.dl_queue_3to2.consume(self.handle_3to2_promotion)
        
        # Consumer for priority 2 -> 1 promotion
        await self.dl_queue_2to1.consume(self.handle_2to1_promotion)
        
        logger.info("Started aging consumers")
    
    async def handle_3to2_promotion(self, message: aio_pika.IncomingMessage):
        """Handle promotion of requests from priority 3 to 2"""
        async with message.process():
            try:
                # Parse request from message body
                request = json.loads(message.body.decode())
                
                # Update priority
                request["priority"] = RequestPriority.CUSTOM_APP
                request["promoted"] = True
                request["promotion_time"] = time.time()
                
                logger.info(f"Promoting request from WEB_INTERFACE to CUSTOM_APP due to aging")
                
                # Publish to priority 2 queue
                await self.publish_request(request)
            
            except Exception as e:
                logger.error(f"Error handling 3->2 promotion: {str(e)}")
    
    async def handle_2to1_promotion(self, message: aio_pika.IncomingMessage):
        """Handle promotion of requests from priority 2 to 1"""
        async with message.process():
            try:
                # Parse request from message body
                request = json.loads(message.body.decode())
                
                # Update priority
                request["priority"] = RequestPriority.DIRECT_API
                request["promoted"] = True
                request["promotion_time"] = time.time()
                
                logger.info(f"Promoting request from CUSTOM_APP to DIRECT_API due to aging")
                
                # Publish to priority 1 queue
                await self.publish_request(request)
            
            except Exception as e:
                logger.error(f"Error handling 2->1 promotion: {str(e)}")
    
    async def publish_request(self, request: Dict[str, Any]):
        """Publish a request to the appropriate queue based on priority"""
        if not self.channel:
            await self.connect()
        
        # Get priority
        priority = request.get("priority", RequestPriority.WEB_INTERFACE)
        
        # Create message
        message = Message(
            body=json.dumps(request).encode(),
            delivery_mode=DeliveryMode.PERSISTENT,
            # Set message headers for dead-lettering
            headers={
                "x-original-priority": request.get("original_priority", priority)
            }
        )
        
        # Publish to exchange with routing key based on priority
        await self.exchange.publish(
            message,
            routing_key=f"priority_{priority}"
        )
        
        logger.info(f"Published request to queue with priority {priority}")
    
    async def add_request(self, request: Dict[str, Any]) -> int:
        """
        Add a request to the appropriate queue based on priority.
        Returns the position in the queue (approximate).
        """
        # Add timestamp to request
        request["timestamp"] = time.time()
        request["status"] = "queued"
        request["original_priority"] = request.get("priority", RequestPriority.WEB_INTERFACE)
        
        # Update statistics
        self.stats["total_requests"] += 1
        
        # Publish to RabbitMQ
        await self.publish_request(request)
        
        # Get approximate queue position
        queue_sizes = await self.get_queue_size()
        position = 0
        for p in sorted(self.queue_names.keys()):
            if p < request["priority"]:
                position += queue_sizes.get(p, 0)
            elif p == request["priority"]:
                position += queue_sizes.get(p, 0) - 1  # -1 because we just added this request
        
        return position
    
    async def get_queue_size(self) -> Dict[int, int]:
        """Get the current size of each queue"""
        if not self.channel:
            await self.connect()
        
        result = {}
        for priority, queue_name in self.queue_names.items():
            # Declare queue to get current size
            queue = await self.channel.declare_queue(
                queue_name,
                durable=True,
                passive=True  # Don't create if doesn't exist
            )
            result[priority] = queue.declaration_result.message_count
        
        return result
    
    async def get_status(self) -> Dict[str, Any]:
        """Get the current status of the queue"""
        queue_sizes = await self.get_queue_size()
        total_size = sum(queue_sizes.values())
        
        return {
            "queue_size": total_size,
            "queue_by_priority": queue_sizes,
            "current_request": self.current_request,
            "stats": self.stats,
            "rabbitmq_connected": self.connection is not None and not self.connection.is_closed
        }
    
    async def clear_queue(self) -> None:
        """Clear all queues (admin only)"""
        if not self.channel:
            await self.connect()
        
        for priority, queue_name in self.queue_names.items():
            await self.channel.queue_purge(queue_name)
        
        logger.info("All queues cleared")
    
    async def get_next_request(self) -> Optional[Dict[str, Any]]:
        """Get the next request from the highest priority non-empty queue"""
        if not self.channel:
            await self.connect()
        
        # Try to get a message from each queue in priority order
        for priority in sorted(self.queue_names.keys()):
            queue_name = self.queue_names[priority]
            
            # Try to get a message with no_ack=False so we can acknowledge it later
            method_frame, header_frame, body = await self.channel.basic_get(
                queue=queue_name,
                no_ack=False
            )
            
            if method_frame:
                # We got a message
                request = json.loads(body.decode())
                
                # Store delivery tag for acknowledgment later
                request["_delivery_tag"] = method_frame.delivery_tag
                request["_queue_name"] = queue_name
                
                return request
        
        # No messages in any queue
        return None
    
    async def process_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a request by forwarding it to Ollama.
        For non-streaming requests.
        """
        # Wait until it's this request's turn
        while True:
            # If no request is being processed, try to process this one
            if self.current_request is None:
                next_request = await self.get_next_request()
                if next_request and next_request["timestamp"] == request["timestamp"]:
                    # It's this request's turn
                    self.current_request = next_request
                    self.current_request["status"] = "processing"
                    self.current_request["processing_start"] = time.time()
                    break
            
            # Wait a bit before checking again
            await asyncio.sleep(0.1)
        
        try:
            # Forward request to Ollama
            endpoint = request["endpoint"].replace("/api", "")
            url = f"{OLLAMA_API_URL}{endpoint}"
            
            async with httpx.AsyncClient() as client:
                # Forward the request to Ollama
                response = await client.post(
                    url,
                    json=request["body"],
                    timeout=60.0  # Longer timeout for LLM requests
                )
                
                # Update request status
                self.current_request["status"] = "completed"
                self.current_request["processing_end"] = time.time()
                
                # Calculate timing statistics
                wait_time = self.current_request["processing_start"] - self.current_request["timestamp"]
                processing_time = self.current_request["processing_end"] - self.current_request["processing_start"]
                
                # Update statistics
                self.stats["completed_requests"] += 1
                self.stats["avg_wait_time"] = (
                    (self.stats["avg_wait_time"] * (self.stats["completed_requests"] - 1) + wait_time) / 
                    self.stats["completed_requests"]
                )
                self.stats["avg_processing_time"] = (
                    (self.stats["avg_processing_time"] * (self.stats["completed_requests"] - 1) + processing_time) / 
                    self.stats["completed_requests"]
                )
                
                # Add to history
                self._add_to_history(self.current_request)
                
                # Acknowledge the message
                await self.channel.basic_ack(self.current_request["_delivery_tag"])
                
                # Clear current request
                self.current_request = None
                
                # Return the response from Ollama
                return response.json()
        
        except Exception as e:
            # Update request status
            if self.current_request:
                self.current_request["status"] = "failed"
                self.current_request["error"] = str(e)
                self.current_request["processing_end"] = time.time()
                
                # Update statistics
                self.stats["failed_requests"] += 1
                
                # Add to history
                self._add_to_history(self.current_request)
                
                # Acknowledge the message (we don't want to retry failed requests automatically)
                await self.channel.basic_ack(self.current_request["_delivery_tag"])
                
                # Clear current request
                self.current_request = None
            
            # Re-raise the exception
            raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")
    
    async def process_streaming_request(self, request: Dict[str, Any]) -> AsyncGenerator[str, None]:
        """
        Process a streaming request by forwarding it to Ollama.
        Yields chunks of the streaming response.
        """
        # Wait until it's this request's turn
        while True:
            # If no request is being processed, try to process this one
            if self.current_request is None:
                next_request = await self.get_next_request()
                if next_request and next_request["timestamp"] == request["timestamp"]:
                    # It's this request's turn
                    self.current_request = next_request
                    self.current_request["status"] = "processing"
                    self.current_request["processing_start"] = time.time()
                    break
            
            # Wait a bit before checking again
            await asyncio.sleep(0.1)
        
        try:
            # Forward request to Ollama
            endpoint = request["endpoint"].replace("/api", "")
            url = f"{OLLAMA_API_URL}{endpoint}"
            
            async with httpx.AsyncClient() as client:
                # Forward the request to Ollama with streaming
                async with client.stream(
                    "POST",
                    url,
                    json=request["body"],
                    timeout=300.0  # Longer timeout for streaming
                ) as response:
                    async for chunk in response.aiter_text():
                        # Yield each chunk to the client
                        yield chunk
                
                # Update request status
                self.current_request["status"] = "completed"
                self.current_request["processing_end"] = time.time()
                
                # Calculate timing statistics
                wait_time = self.current_request["processing_start"] - self.current_request["timestamp"]
                processing_time = self.current_request["processing_end"] - self.current_request["processing_start"]
                
                # Update statistics
                self.stats["completed_requests"] += 1
                self.stats["avg_wait_time"] = (
                    (self.stats["avg_wait_time"] * (self.stats["completed_requests"] - 1) + wait_time) / 
                    self.stats["completed_requests"]
                )
                self.stats["avg_processing_time"] = (
                    (self.stats["avg_processing_time"] * (self.stats["completed_requests"] - 1) + processing_time) / 
                    self.stats["completed_requests"]
                )
                
                # Add to history
                self._add_to_history(self.current_request)
                
                # Acknowledge the message
                await self.channel.basic_ack(self.current_request["_delivery_tag"])
                
                # Clear current request
                self.current_request = None
        
        except Exception as e:
            # Update request status
            if self.current_request:
                self.current_request["status"] = "failed"
                self.current_request["error"] = str(e)
                self.current_request["processing_end"] = time.time()
                
                # Update statistics
                self.stats["failed_requests"] += 1
                
                # Add to history
                self._add_to_history(self.current_request)
                
                # Acknowledge the message
                await self.channel.basic_ack(self.current_request["_delivery_tag"])
                
                # Clear current request
                self.current_request = None
            
            # Yield error message in the streaming format
            yield json.dumps({"error": f"Error processing request: {str(e)}"})
    
    def _add_to_history(self, request: Dict[str, Any]) -> None:
        """Add a request to the history, maintaining maximum history size"""
        # Create a copy with only the relevant fields
        history_entry = {
            "timestamp": request["timestamp"],
            "processing_start": request.get("processing_start"),
            "processing_end": request.get("processing_end"),
            "original_priority": request.get("original_priority"),
            "final_priority": request.get("priority"),
            "promoted": request.get("promoted", False),
            "status": request["status"],
            "endpoint": request["endpoint"],
            "user": request.get("user"),
            "auth_type": request.get("auth_type"),
            "wait_time": request.get("processing_start", 0) - request["timestamp"] if request.get("processing_start") else 0
        }
        
        # Add to history
        self.request_history.append(history_entry)
        
        # Trim history if needed
        if len(self.request_history) > self.max_history_size:
            self.request_history = self.request_history[-self.max_history_size:]
    
    def get_history(self) -> List[Dict[str, Any]]:
        """Get the request history"""
        return self.request_history
    
    async def close(self):
        """Close the RabbitMQ connection"""
        if self.connection and not self.connection.is_closed:
            await self.connection.close()
            logger.info("RabbitMQ connection closed")