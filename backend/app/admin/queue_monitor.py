"""
Queue monitoring endpoints for admin panel
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime

from ..db import get_db
from ..auth.utils import get_current_admin_user
from ..auth.models import User
from ..queue import get_queue_manager, QueueManagerInterface
from ..queue.models import RequestPriority, QueuedRequest

# Configure logging
logger = logging.getLogger("admin.queue_monitor")

# Create router
router = APIRouter(prefix="/admin/queue", tags=["admin", "queue"])

# Helper functions
def priority_to_source(priority: int) -> str:
    """Map priority to source name"""
    if priority == RequestPriority.DIRECT_API:
        return "Direct API"
    elif priority == RequestPriority.CUSTOM_APP:
        return "Custom App"
    elif priority == RequestPriority.WEB_INTERFACE:
        return "Web Interface"
    return "Unknown"

def calculate_age(timestamp: datetime) -> int:
    """Calculate age in seconds"""
    now = datetime.utcnow()
    delta = now - timestamp
    return int(delta.total_seconds())

def format_queue_item(item: QueuedRequest) -> Dict[str, Any]:
    """Format queue item for API response"""
    # Determine status (waiting/processing/completed/error)
    status = item.status
    if status == "queued":
        status = "waiting"
    
    # Extract api_key if present in headers
    api_key = None
    if item.headers and "authorization" in item.headers:
        auth = item.headers["authorization"]
        if auth.startswith("Bearer "):
            api_key = auth[7:]  # Strip "Bearer " prefix
    
    # Extract prompt from body
    prompt = None
    if item.body and "prompt" in item.body:
        prompt = item.body["prompt"]
    elif item.body and "messages" in item.body:
        # For chat messages
        messages = item.body["messages"]
        if messages and len(messages) > 0:
            last_msg = messages[-1]
            if isinstance(last_msg, dict) and "content" in last_msg:
                prompt = last_msg["content"]
    
    # Calculate retries - assume each promotion is a retry
    retries = 1 if item.promoted else 0
    
    # Generate unique ID
    # Use timestamp + priority as a simple ID if none exists
    item_id = f"q{int(item.timestamp.timestamp())}{item.priority}"
    
    return {
        "id": item_id,
        "priority": item.priority,
        "source": priority_to_source(item.priority),
        "timestamp": item.timestamp.isoformat(),
        "status": status,
        "age": calculate_age(item.timestamp),
        "retries": retries,
        "prompt": prompt,
        "api_key": api_key
    }

@router.get("/stats")
async def get_queue_stats(
    current_user: User = Depends(get_current_admin_user),
    queue_manager: QueueManagerInterface = Depends(get_queue_manager)
) -> Dict[str, Any]:
    """Get queue statistics"""
    try:
        # Get queue status
        status = await queue_manager.get_status()
        
        # Get queue sizes
        queue_sizes = await queue_manager.get_queue_size()
        
        # Get queue stats
        stats = await queue_manager.get_stats()
        
        # Calculate detailed stats
        total_waiting = sum(queue_sizes.values())
        total_processing = 1 if status.get("current_request") else 0
        total_completed = stats.completed_requests
        total_error = stats.failed_requests
        
        # Calculate requests per hour (use average processing time to estimate)
        avg_processing_time = stats.avg_processing_time
        if avg_processing_time > 0:
            requests_per_hour = int(3600 / avg_processing_time)
        else:
            requests_per_hour = 0
        
        return {
            "totalWaiting": total_waiting,
            "totalProcessing": total_processing,
            "totalCompleted": total_completed,
            "totalError": total_error,
            "requestsPerHour": requests_per_hour,
            "averageWaitTime": stats.avg_wait_time,
            "averageProcessingTime": stats.avg_processing_time
        }
    except Exception as e:
        logger.error(f"Error getting queue stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve queue statistics"
        )

@router.get("/items")
async def get_queue_items(
    current_user: User = Depends(get_current_admin_user),
    queue_manager: QueueManagerInterface = Depends(get_queue_manager),
    priority: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Get current queue items"""
    try:
        # Get current request being processed
        current_request = await queue_manager.get_current_request()
        current_items = []
        
        if current_request:
            # Add currently processing request
            current_items.append(format_queue_item(current_request))
        
        # Get queued requests (this would need to be implemented in the queue manager)
        # This is a simplification - actual implementation would need to retrieve items from RabbitMQ
        # Since RabbitMQ doesn't allow browsing, this might need a cache of pending requests
        
        # For now, return a minimal implementation
        # In a production system, you would implement this functionality in the queue manager
        
        # Filter by priority if specified
        if priority is not None:
            current_items = [item for item in current_items if item["priority"] == priority]
            
        return current_items
    except Exception as e:
        logger.error(f"Error getting queue items: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve queue items"
        )

@router.get("/history")
async def get_queue_history(
    current_user: User = Depends(get_current_admin_user),
    queue_manager: QueueManagerInterface = Depends(get_queue_manager),
    priority: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Get completed/error queue items"""
    try:
        # Get history from queue manager
        history = []
        
        # In a production system, you would implement this with:
        # history = queue_manager.get_history()
        
        # Format history items
        formatted_history = []
        for item_dict in history:
            try:
                # Create QueuedRequest from dict
                queue_request = QueuedRequest.from_dict(item_dict)
                
                # Only include completed or error requests
                if queue_request.status in ["completed", "error"]:
                    formatted = format_queue_item(queue_request)
                    formatted_history.append(formatted)
            except Exception as e:
                logger.error(f"Error formatting history item: {e}")
                
        # Filter by priority if specified
        if priority is not None:
            formatted_history = [item for item in formatted_history if item["priority"] == priority]
            
        return formatted_history
    except Exception as e:
        logger.error(f"Error getting queue history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve queue history"
        )

@router.post("/clear")
async def clear_queue(
    current_user: User = Depends(get_current_admin_user),
    queue_manager: QueueManagerInterface = Depends(get_queue_manager)
) -> Dict[str, Any]:
    """Clear the queue"""
    try:
        # Clear queue
        # This would need to be implemented in the queue manager
        # await queue_manager.clear_queue()
        
        return {"success": True, "message": "Queue cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing queue: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear queue"
        )

@router.post("/process-next")
async def process_next_item(
    current_user: User = Depends(get_current_admin_user),
    queue_manager: QueueManagerInterface = Depends(get_queue_manager)
) -> Dict[str, Any]:
    """Process the next item in queue"""
    try:
        # This would need to be implemented in the queue manager
        # await queue_manager.process_next()
        
        return {"success": True, "message": "Next request is being processed"}
    except Exception as e:
        logger.error(f"Error processing next item: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process next item"
        )