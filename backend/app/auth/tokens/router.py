"""
Registration token management for authentication system
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
import secrets
import string

from ..models import User, RegistrationToken
from ..activities import log_activity
from ..utils import get_current_admin_user
from ...db import get_db

# Create router
router = APIRouter(tags=["registration-tokens"])

# Registration token management (admin only)
@router.post("/tokens", status_code=status.HTTP_201_CREATED)
async def create_registration_token(
    description: Optional[str] = Body(None),
    expires_days: Optional[int] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new registration token (admin only)"""
    
    # Generate a random token
    alphabet = string.ascii_letters + string.digits
    token = ''.join(secrets.choice(alphabet) for _ in range(16))
    
    # Calculate expiration date if provided
    expires_at = None
    if expires_days:
        expires_at = datetime.utcnow() + timedelta(days=expires_days)
    
    # Create token record
    registration_token = RegistrationToken(
        token=token,
        description=description,
        created_by=current_user.id,
        expires_at=expires_at
    )
    
    # Save to database
    db.add(registration_token)
    db.commit()
    db.refresh(registration_token)
    
    # Log the activity
    await log_activity(
        db,
        current_user.username,
        "generated",
        "token",
        description or f"Registration Token {token[:8]}"
    )
    
    return {
        "token": token,
        "description": description,
        "expires_at": expires_at
    }

@router.get("/tokens")
async def list_registration_tokens(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """List all registration tokens (admin only)"""
    tokens = db.query(RegistrationToken).all()
    
    result = []
    for token in tokens:
        result.append({
            "id": token.id,
            "token": token.token,
            "description": token.description,
            "used": token.used,
            "created_at": token.created_at,
            "expires_at": token.expires_at
        })
    
    return result