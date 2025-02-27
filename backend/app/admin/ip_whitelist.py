"""
IP Whitelist management module for the admin API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime

from ..db import get_db
from ..auth.utils import get_current_admin_user
from ..auth.models import User
from ..auth.activities import log_activity
from ..config import settings

# Create router
router = APIRouter(prefix="/admin", tags=["admin-ip-whitelist"])

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
            "added": datetime.utcnow().strftime("%Y-%m-%d"),  # Real current date
            "lastUsed": None  # We could track this in the future
        })
    
    return ip_list

@router.post("/ip-whitelist", status_code=status.HTTP_201_CREATED)
async def add_ip_whitelist(
    ip_address: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Add IP address to whitelist"""
    # Check if IP already exists
    if ip_address in settings.whitelisted_ips:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="IP address already in whitelist"
        )
    
    # Add IP to whitelist
    settings.add_ip_to_whitelist(ip_address)
    
    # Log activity
    await log_activity(
        db,
        current_user.username,
        "added",
        "ip",
        ip_address
    )
    
    # Return the new IP with an ID
    return {
        "id": len(settings.whitelisted_ips),
        "ip": ip_address,
        "added": datetime.utcnow().strftime("%Y-%m-%d"),
        "lastUsed": None
    }

@router.delete("/ip-whitelist/{ip_id}")
async def remove_ip_whitelist(
    ip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, str]:
    """Remove IP address from whitelist"""
    # Validate IP ID
    if ip_id < 1 or ip_id > len(settings.whitelisted_ips):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="IP ID not found"
        )
    
    # Get the IP address
    ip_to_remove = settings.whitelisted_ips[ip_id - 1]
    
    # Remove IP from whitelist
    settings.remove_ip_from_whitelist(ip_to_remove)
    
    # Log activity
    await log_activity(
        db,
        current_user.username,
        "removed",
        "ip",
        ip_to_remove
    )
    
    return {"message": "IP removed from whitelist"}

@router.get("/client-ip")
async def get_client_ip(
    request: Request,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, str]:
    """Get the client's IP address"""
    client_ip = request.client.host
    return {"ip": client_ip}