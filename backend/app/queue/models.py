import enum
from typing import Dict, Any, Optional
from datetime import datetime

class RequestPriority(enum.IntEnum):
    """Priority levels for requests"""
    DIRECT_API = 1  # Highest priority (direct API access)
    CUSTOM_APP = 2  # Medium priority (custom applications)
    WEB_INTERFACE = 3  # Lowest priority (web interface)

class QueueStats:
    """Statistics for queue operations"""
    def __init__(self):
        self.total_requests: int = 0
        self.completed_requests: int = 0
        self.failed_requests: int = 0
        self.avg_wait_time: float = 0
        self.avg_processing_time: float = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert stats to dictionary"""
        return {
            "total_requests": self.total_requests,
            "completed_requests": self.completed_requests,
            "failed_requests": self.failed_requests,
            "avg_wait_time": self.avg_wait_time,
            "avg_processing_time": self.avg_processing_time
        }

    def update_timing(self, wait_time: float, processing_time: float) -> None:
        """Update timing statistics"""
        self.completed_requests += 1
        self.avg_wait_time = (
            (self.avg_wait_time * (self.completed_requests - 1) + wait_time) / 
            self.completed_requests
        )
        self.avg_processing_time = (
            (self.avg_processing_time * (self.completed_requests - 1) + processing_time) / 
            self.completed_requests
        )

class QueuedRequest:
    """A request in the queue"""
    def __init__(
        self,
        priority: RequestPriority,
        endpoint: str,
        body: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None,
        user_id: Optional[int] = None,
        auth_type: Optional[str] = None
    ):
        self.priority = priority
        self.endpoint = endpoint
        self.body = body
        self.headers = headers or {}
        self.user_id = user_id
        self.auth_type = auth_type
        self.timestamp = datetime.utcnow()
        self.status = "queued"
        self.original_priority = priority
        self.promoted = False
        self.promotion_time: Optional[datetime] = None
        self.processing_start: Optional[datetime] = None
        self.processing_end: Optional[datetime] = None
        self.error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert request to dictionary for storage"""
        # Convert enum values to ints for consistent serialization
        priority_value = self.priority.value if hasattr(self.priority, 'value') else self.priority
        original_priority_value = self.original_priority.value if hasattr(self.original_priority, 'value') else self.original_priority
        
        return {
            "priority": priority_value,  # Store raw value, not enum
            "endpoint": self.endpoint,
            "body": self.body,
            "headers": self.headers,
            "user_id": self.user_id,
            "auth_type": self.auth_type,
            "timestamp": self.timestamp.timestamp(),
            "status": self.status,
            "original_priority": original_priority_value,  # Store raw value, not enum
            "promoted": self.promoted,
            "promotion_time": self.promotion_time.timestamp() if self.promotion_time else None,
            "processing_start": self.processing_start.timestamp() if self.processing_start else None,
            "processing_end": self.processing_end.timestamp() if self.processing_end else None,
            "error": self.error
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "QueuedRequest":
        """Create request from dictionary"""
        # Convert priority from int value to enum if needed
        priority = data["priority"]
        if isinstance(priority, int) or (isinstance(priority, str) and priority.isdigit()):
            # Convert string digits or ints to int, then to enum
            priority_int = int(priority)
            # Find matching enum by value
            priority = next((p for p in RequestPriority if p.value == priority_int), 
                           RequestPriority.WEB_INTERFACE)  # Default to WEB_INTERFACE if not found
        
        # Same for original_priority
        original_priority = data.get("original_priority", priority)
        if isinstance(original_priority, int) or (isinstance(original_priority, str) and str(original_priority).isdigit()):
            original_priority_int = int(original_priority)
            original_priority = next((p for p in RequestPriority if p.value == original_priority_int),
                                   RequestPriority.WEB_INTERFACE)
        
        request = cls(
            priority=priority,
            endpoint=data["endpoint"],
            body=data["body"],
            headers=data.get("headers"),
            user_id=data.get("user_id"),
            auth_type=data.get("auth_type")
        )
        request.timestamp = datetime.fromtimestamp(data["timestamp"])
        request.status = data["status"]
        request.original_priority = original_priority
        request.promoted = data.get("promoted", False)
        if data.get("promotion_time"):
            request.promotion_time = datetime.fromtimestamp(data["promotion_time"])
        if data.get("processing_start"):
            request.processing_start = datetime.fromtimestamp(data["processing_start"])
        if data.get("processing_end"):
            request.processing_end = datetime.fromtimestamp(data["processing_end"])
        request.error = data.get("error")
        return request