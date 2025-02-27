"""
Activity logging functionality for the auth module
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from .models import User, ActivityLog
from .utils import get_current_admin_user
from ..db import get_db

# Create router
router = APIRouter(prefix="/auth", tags=["activities"])

# Helper function to log activities
async def log_activity(
    db: Session,
    username: str,
    action: str,
    resource_type: str,
    resource_name: str
):
    """Log an activity in the database"""
    activity = ActivityLog(
        username=username,
        action=action,
        resource_type=resource_type,
        resource_name=resource_name
    )
    db.add(activity)
    db.commit()
    return activity

# Activities endpoint
@router.get("/activities")
async def list_activities(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """List recent activity logs (admin only)"""
    activities = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(limit).all()
    
    result = []
    for activity in activities:
        result.append({
            "id": activity.id,
            "type": activity.resource_type,
            "action": activity.action,
            "user": activity.username,
            "target": activity.resource_name,
            "time": activity.timestamp
        })
    
    return result