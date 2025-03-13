"""
Queue integration for position tracking and status updates
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import asyncio

from ..models import User
from ..utils import get_current_user
from ...db import get_db
from ...queue import get_queue_manager, QueuedRequest, RequestPriority

# Create router
router = APIRouter(tags=["queue"])

# Get queue position for a request
@router.get("/position/{request_id}")
async def get_queue_position(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the position of a request in the queue"""
    queue_manager = get_queue_manager()
    await queue_manager.ensure_connected()
    
    # Create a dummy request with the same timestamp to check position
    dummy_request = QueuedRequest(
        id=request_id,
        user_id=current_user.id,
        priority=RequestPriority.WEB_INTERFACE,  # Web interface priority
        endpoint="/api/chat/completions",
        body={},
        auth_type="jwt"
    )
    
    position = await queue_manager.get_position(dummy_request)
    
    return {
        "request_id": request_id,
        "position": position,
        "is_processing": position == 0
    }

# Get queue status
@router.get("/status")
async def get_queue_status(
    current_user: User = Depends(get_current_user)
):
    """Get the current status of the queue system"""
    queue_manager = get_queue_manager()
    await queue_manager.ensure_connected()
    
    stats = await queue_manager.get_stats()
    queue_sizes = await queue_manager.get_queue_size()
    
    # Get current request being processed
    current_request = await queue_manager.get_current_request()
    
    return {
        "queue_sizes": queue_sizes,
        "total_pending": sum(queue_sizes.values()),
        "is_processing": current_request is not None,
        "processing_user_id": current_request.user_id if current_request else None,
        "stats": {
            "total_processed": stats.total_processed,
            "total_errors": stats.total_errors,
            "avg_processing_time": stats.avg_processing_time_ms
        }
    }