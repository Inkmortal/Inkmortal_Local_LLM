"""
User management endpoints for the authentication system
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta

from ..models import User
from ..utils import get_current_admin_user, get_current_user, oauth2_scheme
from ..activities import log_activity
from ...db import get_db

# Create router
router = APIRouter(tags=["users"])

# Get current user info - standardized endpoint
@router.get("/me")
async def read_current_user(
    request: Request,
    current_user: User = Depends(get_current_user),
    token: str = Depends(oauth2_scheme)
):
    """
    Get current authenticated user information
    
    If X-Refresh-Token header is present, a new token will be generated
    and included in the response.
    """
    # Base response with user information
    response_data = {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_admin": current_user.is_admin,
        "created_at": current_user.created_at
    }
    
    # Check if token refresh was requested
    should_refresh = request.headers.get("X-Refresh-Token") == "true"
    
    if should_refresh:
        # Create a new token with the same data but extended expiration
        from ..utils import create_access_token
        
        # Use the standard 14-day expiration for refreshed tokens
        expires_delta = timedelta(days=14)
        
        # Create the new token
        access_token = create_access_token(
            data={"sub": current_user.username},
            expires_delta=expires_delta
        )
        
        # Add the new token to the response
        response_data["access_token"] = access_token
        response_data["token_type"] = "bearer"
    
    return response_data

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