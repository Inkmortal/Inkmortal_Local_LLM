"""
Admin API Router for dashboard and management functions
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from ..db import get_db
from ..auth.utils import get_current_admin_user
from ..auth.models import User
from ..queue import get_queue_manager, QueueManagerInterface
from ..config import settings
from .stats import get_dashboard_stats

# Create router
router = APIRouter(prefix="/admin", tags=["admin"])

# Create a FastAPI dependency for the queue manager
async def get_queue() -> QueueManagerInterface:
    """Get the queue manager instance"""
    queue_manager = get_queue_manager()
    if not settings.is_testing:
        await queue_manager.ensure_connected()
    return queue_manager

@router.get("/dashboard")
async def admin_dashboard(
    current_user: User = Depends(get_current_admin_user),
    queue_manager: QueueManagerInterface = Depends(get_queue),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get statistics for the admin dashboard"""
    return await get_dashboard_stats(db, queue_manager, current_user)

@router.get("/ip-whitelist")
async def get_ip_whitelist(
    current_user: User = Depends(get_current_admin_user)
) -> List[Dict[str, Any]]:
    """Get all whitelisted IP addresses"""
    # Get IP whitelist from settings
    whitelist = settings.whitelisted_ips
    
    # Format the response
    ip_list = []
    for i, ip in enumerate(whitelist):
        ip_list.append({
            "id": i + 1,
            "ip": ip,
            "added": "2025-02-20",  # Mock data since we don't store this
            "lastUsed": None  # Mock data since we don't track this
        })
    
    return ip_list

@router.get("/client-ip")
async def get_client_ip(
    request: Request,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, str]:
    """Get the client's IP address"""
    client_ip = request.client.host
    return {"ip": client_ip}