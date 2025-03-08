"""
User management endpoints for the authentication system
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..models import User
from ..utils import get_current_admin_user, get_current_user
from ..activities import log_activity
from ...db import get_db

# Create router
router = APIRouter(prefix="/auth", tags=["users"])

# Get current user info
@router.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_admin": current_user.is_admin,
        "created_at": current_user.created_at
    }

# User management endpoints (admin only)
@router.get("/users")
async def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """List all users (admin only)"""
    users = db.query(User).all()
    
    result = []
    for user in users:
        result.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_admin": user.is_admin,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "updated_at": user.updated_at
        })
    
    return result

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Delete a user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deleting the last admin account
    if user.is_admin:
        admin_count = db.query(User).filter(User.is_admin == True).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last admin account"
            )
    
    # Prevent an admin from deleting themselves
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )
    
    # Get user info for logging
    user_description = f"User {user.username}"
    
    # Delete the user
    db.delete(user)
    db.commit()
    
    # Log the activity
    await log_activity(
        db,
        current_user.username,
        "deleted",
        "user",
        user_description
    )
    
    return {"message": "User deleted successfully"}