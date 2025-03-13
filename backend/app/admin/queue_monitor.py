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
def priority_to_source(priority) -> str:
    """Map priority to source name"""
    # Handle both enum instance and integer value
    if hasattr(priority, 'value'):
        priority_value = priority.value
    else:
        priority_value = priority
    
    if priority_value == RequestPriority.DIRECT_API.value:
        return "Direct API"
    elif priority_value == RequestPriority.CUSTOM_APP.value:
        return "Custom App"
    elif priority_value == RequestPriority.WEB_INTERFACE.value:
        return "Web Interface"
    return f"Unknown ({priority_value})"

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
        queue_items = []
        
        if current_request:
            # Add currently processing request with status
            item = format_queue_item(current_request)
            item["status"] = "processing"  # Force processing status
            queue_items.append(item)
        
        # Get queue sizes to report accurate counts
        queue_sizes = await queue_manager.get_queue_size()
        
        # For each priority, add placeholder items to represent queued messages
        # Since RabbitMQ doesn't allow browsing without consuming, we create representative placeholders
        for priority in sorted(RequestPriority):
            queue_size = queue_sizes.get(priority, 0)
            if queue_size > 0:
                # Create a placeholder item for each priority queue that has messages
                for i in range(queue_size):
                    placeholder_id = f"queue_{priority.name}_{i}"
                    queue_items.append({
                        "id": placeholder_id,
                        "priority": priority.value,
                        "source": priority_to_source(priority),
                        "timestamp": datetime.utcnow().isoformat(),
                        "status": "waiting",
                        "age": 0,  # Unknown actual age
                        "retries": 0,
                        "prompt": f"Message in {priority_to_source(priority)} queue",
                        "api_key": None,
                        "position": i + 1  # Position in this priority queue
                    })
        
        # Filter by priority if specified
        if priority is not None:
            queue_items = [item for item in queue_items if item["priority"] == priority]
            
        return queue_items
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
        # Get history from our recently added history tracking in queue manager
        # The history is now maintained by the consumer.py implementation
        history = queue_manager.get_history()
        
        # Format history items
        formatted_history = []
        for item_dict in history:
            try:
                # Create QueuedRequest from dict if needed
                if isinstance(item_dict, dict):
                    queue_request = QueuedRequest.from_dict(item_dict)
                else:
                    queue_request = item_dict
                
                # Only include completed or error requests
                if queue_request.status in ["completed", "failed", "error"]:
                    formatted = format_queue_item(queue_request)
                    formatted_history.append(formatted)
            except Exception as e:
                logger.error(f"Error formatting history item: {e}")
                logger.error(f"Item content: {str(item_dict)[:200]}...")
                
        # Filter by priority if specified
        if priority is not None:
            formatted_history = [item for item in formatted_history if item["priority"] == priority]
            
        # Limit to most recent 100 items to prevent overwhelming the UI
        return formatted_history[:100]
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
        # Clear all queues using the existing method
        await queue_manager.clear_queue()
        logger.info(f"Queue cleared by admin user: {current_user.username}")
        
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
        # Get the next message from the queue but don't process it yet
        next_request = await queue_manager.get_next_request()
        
        if next_request:
            # Process the request
            logger.info(f"Processing next request manually: {next_request.endpoint}")
            
            # Determine if this is a streaming request
            is_streaming = next_request.body.get("stream", False) or "streaming" in next_request.endpoint
            
            if is_streaming:
                # Create a background task to handle streaming without blocking the API response
                import asyncio
                from ..queue.consumer import process_streaming_request
                asyncio.create_task(process_streaming_request(queue_manager, next_request))
                message = f"Streaming request from {priority_to_source(next_request.priority)} is being processed"
            else:
                # Process directly (non-streaming)
                await queue_manager.process_request(next_request)
                message = f"Request from {priority_to_source(next_request.priority)} has been processed"
                
            return {"success": True, "message": message}
        else:
            return {"success": False, "message": "No requests in queue to process"}
    except Exception as e:
        logger.error(f"Error processing next item: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process next item"
        )