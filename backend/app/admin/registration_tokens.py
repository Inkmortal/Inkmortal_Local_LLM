"""
Registration token management module for the admin API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import secrets
from datetime import datetime, timedelta

from ..db import get_db
from ..auth.utils import get_current_admin_user
from ..auth.models import User, RegistrationToken
from ..auth.activities import log_activity

# Create router
router = APIRouter(prefix="/admin", tags=["admin-tokens"])

@router.get("/tokens")
async def list_admin_registration_tokens(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> List[Dict[str, Any]]:
    """List all registration tokens (admin view)"""
    tokens = db.query(RegistrationToken).all()
    
    result = []
    for token in tokens:
        # Get user information if the token has been used
        used_by_info = None
        if token.used and token.used_by:
            user = db.query(User).filter(User.id == token.used_by).first()
            if user:
                used_by_info = user.email or user.username

        result.append({
            "id": token.id,
            "token": token.token,
            "created": token.created_at.strftime("%Y-%m-%d"),
            "expires": token.expires_at.strftime("%Y-%m-%d") if token.expires_at else None,
            "used": token.used,
            "usedBy": used_by_info,
            "usedOn": token.created_at.strftime("%Y-%m-%d") if token.used else None
        })
    
    return result

@router.post("/tokens", status_code=status.HTTP_201_CREATED)
async def create_admin_registration_token(
    expires_days: Optional[int] = Body(30, embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Create a new registration token (admin only)"""
    
    # Generate a random token
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    token = 'TKN_' + ''.join(secrets.choice(alphabet) for _ in range(12))
    
    # Calculate expiration date if provided
    expires_at = None
    if expires_days and expires_days > 0:
        expires_at = datetime.utcnow() + timedelta(days=expires_days)
    
    # Create token record
    registration_token = RegistrationToken(
        token=token,
        description="Generated via admin panel",
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
        f"Registration token {token[:8]}..."
    )
    
    return {
        "id": registration_token.id,
        "token": token,
        "created": registration_token.created_at.strftime("%Y-%m-%d"),
        "expires": registration_token.expires_at.strftime("%Y-%m-%d") if registration_token.expires_at else None,
        "used": False,
        "usedBy": None,
        "usedOn": None
    }

@router.delete("/tokens/{token_id}")
async def revoke_registration_token(
    token_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, str]:
    """Revoke (delete) a registration token"""
    token = db.query(RegistrationToken).filter(RegistrationToken.id == token_id).first()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )
    
    # Get token info for logging
    token_info = f"Registration token {token.token[:8]}..."
    
    # Different log message based on whether token was used or not
    action = "deleted" if token.used else "revoked"
    
    # Delete the token
    db.delete(token)
    db.commit()
    
    # Log the activity
    await log_activity(
        db,
        current_user.username,
        action,
        "token",
        token_info
    )
    
    return {"message": f"Token {action} successfully"}