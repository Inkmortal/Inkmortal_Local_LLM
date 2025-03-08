"""
API Key management endpoints for authentication system
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import Optional, List
import secrets
import string

from ..models import User, APIKey
from ..activities import log_activity
from ..utils import get_current_admin_user
from ...db import get_db

# Create router
router = APIRouter(tags=["api-keys"])

# API key management
@router.post("/apikeys", status_code=status.HTTP_201_CREATED)
async def create_api_key(
    description: Optional[str] = Body(None),
    priority: int = Body(2),  # Default to priority level 2
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new API key (admin only)"""
    
    # Validate priority level
    if priority < 1 or priority > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Priority must be between 1 and 3"
        )
    
    # Generate a random API key
    key = "sk-" + ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
    
    # Create API key record
    api_key = APIKey(
        key=key,
        description=description,
        user_id=current_user.id,
        priority=priority
    )
    
    # Save to database
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    
    # Log the activity
    await log_activity(
        db,
        current_user.username,
        "created",
        "api-key",
        description or f"API Key {key[:8]}"
    )
    
    return {
        "key": key,
        "description": description,
        "priority": priority
    }

@router.get("/apikeys")
async def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """List all API keys (admin only)"""
    keys = db.query(APIKey).all()
    
    result = []
    for key in keys:
        result.append({
            "id": key.id,
            "key": key.key[:8] + "..." + key.key[-4:],  # Only show part of the key for security
            "description": key.description,
            "priority": key.priority,
            "is_active": key.is_active,
            "created_at": key.created_at,
            "last_used": key.last_used
        })
    
    return result

@router.delete("/apikeys/{key_id}")
async def delete_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Delete an API key (admin only)"""
    key = db.query(APIKey).filter(APIKey.id == key_id).first()
    
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Get key description before deletion for logging
    key_description = key.description or f"API Key {key.key[:8]}"
    
    db.delete(key)
    db.commit()
    
    # Log the activity
    await log_activity(
        db,
        current_user.username,
        "deleted",
        "api-key",
        key_description
    )
    
    return {"message": "API key deleted successfully"}