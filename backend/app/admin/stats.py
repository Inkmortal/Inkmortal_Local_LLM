"""
Admin statistics module for dashboard data
"""
from fastapi import Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from datetime import datetime
import time
import logging

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

from ..db import get_db
from ..auth.models import APIKey, RegistrationToken, User, ActivityLog
from ..config import settings
from ..queue import QueueManagerInterface, get_queue_manager

# Configure logging
logger = logging.getLogger("admin_stats")

async def get_dashboard_stats(
    db: Session, 
    queue_manager: QueueManagerInterface,
    current_user: User
) -> Dict[str, Any]:
    """
    Get statistics for the admin dashboard
    Returns formatted data for dashboard cards, system stats, and recent activities
    """
    try:
        # Count API keys
        api_key_count = db.query(APIKey).count()
        
        # Count registration tokens
        token_count = db.query(RegistrationToken).count()
        active_token_count = db.query(RegistrationToken).filter(RegistrationToken.used == False).count()
        
        # Get whitelisted IPs count
        ip_count = len(settings.whitelisted_ips)
        
        # Get queue status with robust error handling
        try:
            queue_status = await queue_manager.get_status()
            queue_count = queue_status.get("total_requests", 0)
            processing_count = queue_status.get("processing", 0)
            queue_connected = True
        except Exception as e:
            logger.error(f"Error getting queue status: {e}")
            queue_count = 0
            processing_count = 0
            queue_connected = False
        
        # Get system stats
        system_stats = get_system_stats()
        
        # Get Ollama status from health check with error handling
        try:
            ollama_status = await get_ollama_status(queue_manager)
        except Exception as e:
            logger.error(f"Error getting Ollama status: {e}")
            ollama_status = {
                "status": "Offline",
                "model": settings.default_model,
                "version": "Unknown"
            }
        
        # Get real activity logs from database
        try:
            recent_activities = await get_recent_activities(db)
        except Exception as e:
            logger.error(f"Error getting activity logs: {e}")
            recent_activities = []
        
        return {
            "dashboard_cards": get_dashboard_cards(
                ip_count, token_count, active_token_count,
                api_key_count, queue_count, processing_count
            ),
            "system_stats": {
                **system_stats,
                "ollama": ollama_status,
                "queue_connected": queue_connected
            },
            "recent_activities": recent_activities
        }
    except Exception as e:
        logger.error(f"Error in dashboard stats: {e}")
        
        # Provide minimal data to avoid frontend errors
        return {
            "dashboard_cards": [
                {
                    "id": "ip-whitelist",
                    "title": "IP Whitelist",
                    "count": 0,
                    "path": "/admin/ip-whitelist"
                },
                {
                    "id": "tokens",
                    "title": "Registration Tokens",
                    "count": 0,
                    "active": 0,
                    "path": "/admin/tokens"
                },
                {
                    "id": "api-keys",
                    "title": "API Keys",
                    "count": 0,
                    "path": "/admin/api-keys"
                },
                {
                    "id": "queue",
                    "title": "Queue Monitor",
                    "count": 0,
                    "processing": 0,
                    "path": "/admin/queue"
                }
            ],
            "system_stats": {
                "cpu": 0,
                "memory": 0,
                "storage": 0,
                "uptime": "Unavailable",
                "ollama": {
                    "status": "Offline",
                    "model": "Unavailable",
                    "version": "Unavailable"
                },
                "queue_connected": False
            },
            "recent_activities": []
        }

def get_dashboard_cards(
    ip_count: int, 
    token_count: int, 
    active_token_count: int,
    api_key_count: int, 
    queue_count: int, 
    processing_count: int
) -> List[Dict[str, Any]]:
    """Generate dashboard card data"""
    return [
        {
            "id": "ip-whitelist",
            "title": "IP Whitelist",
            "count": ip_count,
            "path": "/admin/ip-whitelist"
        },
        {
            "id": "tokens",
            "title": "Registration Tokens",
            "count": token_count,
            "active": active_token_count,
            "path": "/admin/tokens"
        },
        {
            "id": "api-keys",
            "title": "API Keys",
            "count": api_key_count,
            "path": "/admin/api-keys"
        },
        {
            "id": "queue",
            "title": "Queue Monitor",
            "count": queue_count,
            "processing": processing_count,
            "path": "/admin/queue"
        }
    ]

def get_system_stats() -> Dict[str, Any]:
    """Get system statistics using psutil if available"""
    if not PSUTIL_AVAILABLE:
        return {
            "cpu": 0,
            "memory": 0,
            "storage": 0,
            "uptime": "Unknown"
        }
    
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=0.5)
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        
        # Disk usage
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        
        # System uptime
        uptime_seconds = time.time() - psutil.boot_time()
        days, remainder = divmod(uptime_seconds, 86400)
        hours, remainder = divmod(remainder, 3600)
        minutes, _ = divmod(remainder, 60)
        uptime_str = f"{int(days)}d {int(hours)}h {int(minutes)}m"
        
        return {
            "cpu": cpu_percent,
            "memory": memory_percent,
            "storage": disk_percent,
            "uptime": uptime_str
        }
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        return {
            "cpu": 0,
            "memory": 0,
            "storage": 0,
            "uptime": "Unknown"
        }

async def get_ollama_status(queue_manager: QueueManagerInterface) -> Dict[str, Any]:
    """Get Ollama status information"""
    # Get status from queue manager
    status = await queue_manager.get_status()
    ollama_connected = status.get("ollama_connected", False)
    
    return {
        "status": "Running" if ollama_connected else "Offline",
        "model": settings.default_model,
        "version": "0.2.1"  # This would be dynamically retrieved in production
    }

async def get_recent_activities(db: Session) -> List[Dict[str, Any]]:
    """Get recent activities from the database"""
    # Get most recent activity logs (limit to 10)
    activities = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(10).all()
    
    result = []
    for activity in activities:
        # Calculate relative time
        time_diff = datetime.utcnow() - activity.timestamp
        
        if time_diff.days > 0:
            time_str = f"{time_diff.days} days ago"
        elif time_diff.seconds >= 3600:
            hours = time_diff.seconds // 3600
            time_str = f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif time_diff.seconds >= 60:
            minutes = time_diff.seconds // 60
            time_str = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            time_str = "Just now"
        
        result.append({
            "id": activity.id,
            "type": activity.resource_type,
            "action": activity.action,
            "user": activity.username,
            "target": activity.resource_name,
            "time": time_str
        })
    
    return result