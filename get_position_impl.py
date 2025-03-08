"""
Implementation of get_position method for RabbitMQManager.
Add this method to the RabbitMQManager class in backend/app/queue/rabbitmq/manager.py
before the _add_to_history method.
"""

async def get_position(self, request: QueuedRequest) -> Optional[int]:
    """Get the position of a request in the queue"""
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
        # For now, we'll use a simplistic approach - requests in higher priority queues 
        # will be processed first
        position = 0
        
        # Add count of all higher priority queues
        for priority in sorted(queue_sizes.keys(), reverse=True):
            if priority > request.priority:
                position += queue_sizes[priority]
        
        # If we get here, the request is likely still in the queue
        # but we can't know its exact position
        # We'll return a reasonable estimate based on queue sizes
        return position
        
    except Exception as e:
        logger.error(f"Error getting request position: {str(e)}")
        return None