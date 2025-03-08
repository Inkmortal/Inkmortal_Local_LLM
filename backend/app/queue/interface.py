"""
Queue Manager Interface definition.
This module defines the interface that all queue manager implementations must follow.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, AsyncGenerator

from .models import QueuedRequest, QueueStats

class QueueManagerInterface(ABC):
    """
    Abstract interface for queue managers.
    All queue manager implementations must implement these methods.
    """
    
    @abstractmethod
    async def connect(self) -> None:
        """Connect to the queue system"""
        pass

    @abstractmethod
    async def ensure_connected(self) -> None:
        """Ensure connection is established"""
        pass

    @abstractmethod
    async def close(self) -> None:
        """Close the queue connection"""
        pass

    @abstractmethod
    async def add_request(self, request: QueuedRequest) -> int:
        """
        Add a request to the queue.
        Returns the position in the queue (approximate).
        """
        pass

    @abstractmethod
    async def get_next_request(self) -> Optional[QueuedRequest]:
        """Get the next request from the highest priority non-empty queue"""
        pass

    @abstractmethod
    async def process_request(self, request: QueuedRequest) -> Dict[str, Any]:
        """Process a request synchronously"""
        pass

    @abstractmethod
    async def process_streaming_request(self, request: QueuedRequest) -> AsyncGenerator[str, None]:
        """Process a request with streaming response"""
        pass

    @abstractmethod
    async def clear_queue(self) -> None:
        """Clear all queues"""
        pass

    @abstractmethod
    async def get_queue_size(self) -> Dict[int, int]:
        """Get the current size of each priority queue"""
        pass

    @abstractmethod
    async def get_status(self) -> Dict[str, Any]:
        """Get the current status of the queue system"""
        pass

    @abstractmethod
    def get_history(self) -> List[Dict[str, Any]]:
        """Get the request history"""
        pass

    @abstractmethod
    async def promote_request(self, request: QueuedRequest, new_priority: int) -> None:
        """Promote a request to a higher priority"""
        pass

    @abstractmethod
    async def handle_request_aging(self) -> None:
        """Handle aging of requests in queues"""
        pass

    @abstractmethod
    async def get_stats(self) -> QueueStats:
        """Get queue statistics"""
        pass

    @abstractmethod
    async def reset_stats(self) -> None:
        """Reset queue statistics"""
        pass
        
    @abstractmethod
    async def get_current_request(self) -> Optional[QueuedRequest]:
        """Get the request currently being processed, if any"""
        pass
        
    @abstractmethod
    async def get_position(self, request: QueuedRequest) -> Optional[int]:
        """Get the position of a request in the queue, or None if not in queue"""
        pass