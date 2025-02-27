"""
API key management module for the admin API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import secrets
import string

from ..db import get_db
from ..auth.utils import get_current_admin_user
from ..auth.models import User, APIKey
from ..auth.activities import log_activity

# Create router
router = APIRouter(prefix="/admin", tags=["admin-apikeys"])

@router.get("/api-keys")
async def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> List[Dict[str, Any]]:
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
            "created_at": key.created_at.strftime("%Y-%m-%d"),
            "last_used": key.last_used.strftime("%Y-%m-%d") if key.last_used else None
        })
    
    return result

@router.post("/api-keys", status_code=status.HTTP_201_CREATED)
async def create_api_key(
    description: Optional[str] = Body(None, embed=True),
    priority: int = Body(2, embed=True),  # Default to priority level 2
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
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
        "id": api_key.id,
        "key": key,  # Return the full key since this is the only time it will be visible
        "description": description,
        "priority": priority,
        "is_active": True,
        "created_at": api_key.created_at.strftime("%Y-%m-%d"),
        "last_used": None
    }

@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, str]:
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