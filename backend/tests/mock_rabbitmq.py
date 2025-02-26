import asyncio
import json
from typing import Dict, List, Any, Optional, AsyncGenerator, Callable
from unittest.mock import MagicMock, patch
import aio_pika
from aio_pika import Message, DeliveryMode, ExchangeType

class MockChannel:
    """Mock RabbitMQ channel for testing"""
    
    def __init__(self):
        self.queues = {}
        self.exchanges = {}
        self.bindings = {}
        self.consumers = {}
    
    async def declare_queue(self, name, durable=False, passive=False, **kwargs):
        """Mock queue declaration"""
        if passive and name not in self.queues:
            raise aio_pika.exceptions.QueueNotFound(f"Queue {name} not found")
        
        if name not in self.queues:
            self.queues[name] = []
        
        # Create a mock queue object
        queue = MagicMock()
        queue.name = name
        queue.declaration_result = MagicMock()
        queue.declaration_result.message_count = len(self.queues[name])
        
        # Add bind method
        async def bind(exchange, routing_key):
            if exchange.name not in self.bindings:
                self.bindings[exchange.name] = {}
            self.bindings[exchange.name][routing_key] = name
        
        queue.bind = bind
        
        # Add consume method
        async def consume(callback):
            self.consumers[name] = callback
            return MagicMock()
        
        queue.consume = consume
        
        return queue
    
    async def declare_exchange(self, name, type=ExchangeType.DIRECT, durable=False, **kwargs):
        """Mock exchange declaration"""
        if name not in self.exchanges:
            self.exchanges[name] = {}
        
        # Create a mock exchange object
        exchange = MagicMock()
        exchange.name = name
        
        # Add publish method
        async def publish(message, routing_key):
            if name in self.bindings and routing_key in self.bindings[name]:
                queue_name = self.bindings[name][routing_key]
                self.queues[queue_name].append({
                    "body": message.body,
                    "headers": message.headers,
                    "delivery_tag": len(self.queues[queue_name]) + 1
                })
        
        exchange.publish = publish
        
        return exchange
    
    async def basic_get(self, queue, no_ack=False):
        """Mock basic_get method"""
        if queue not in self.queues or not self.queues[queue]:
            return None, None, None
        
        message = self.queues[queue][0]
        if no_ack:
            self.queues[queue].pop(0)
        
        # Create method frame
        method_frame = MagicMock()
        method_frame.delivery_tag = message["delivery_tag"]
        
        # Create header frame
        header_frame = MagicMock()
        header_frame.headers = message["headers"]
        
        return method_frame, header_frame, message["body"]
    
    async def basic_ack(self, delivery_tag):
        """Mock basic_ack method"""
        for queue_name, messages in self.queues.items():
            for i, message in enumerate(messages):
                if message["delivery_tag"] == delivery_tag:
                    self.queues[queue_name].pop(i)
                    return
    
    async def queue_purge(self, queue_name):
        """Mock queue_purge method"""
        if queue_name in self.queues:
            self.queues[queue_name] = []

class MockConnection:
    """Mock RabbitMQ connection for testing"""
    
    def __init__(self):
        self.is_closed = False
        self._channel = MockChannel()
    
    async def channel(self):
        """Return the mock channel"""
        return self._channel
    
    async def close(self):
        """Close the connection"""
        self.is_closed = True

@patch('aio_pika.connect_robust')
async def mock_rabbitmq_connect(mock_connect):
    """Set up mock RabbitMQ connection"""
    connection = MockConnection()
    mock_connect.return_value = connection
    return connection