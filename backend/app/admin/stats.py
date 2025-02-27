"""
Admin statistics module for dashboard data
"""
from fastapi import Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import time

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

from ..db import get_db
from ..auth.models import APIKey, RegistrationToken, User
from ..config import settings
from ..queue import QueueManagerInterface, get_queue_manager

async def get_dashboard_stats(
    db: Session, 
    queue_manager: QueueManagerInterface,
    current_user: User
) -> Dict[str, Any]:
    """
    Get statistics for the admin dashboard
    Returns formatted data for dashboard cards, system stats, and recent activities
    """
    # Count API keys
    api_key_count = db.query(APIKey).count()
    
    # Count registration tokens
    token_count = db.query(RegistrationToken).count()
    active_token_count = db.query(RegistrationToken).filter(RegistrationToken.used == False).count()
    
    # Get whitelisted IPs count
    ip_count = len(settings.whitelisted_ips)
    
    # Get queue status
    queue_status = await queue_manager.get_status()
    queue_count = queue_status.get("total_requests", 0)
    processing_count = queue_status.get("processing", 0)
    
    # Get system stats
    system_stats = get_system_stats()
    
    # Get Ollama status from health check
    ollama_status = await get_ollama_status(queue_manager)
    
    # Placeholder for recent activities (would come from a database in production)
    recent_activities = get_mock_activities(current_user.username)
    
    return {
        "dashboard_cards": get_dashboard_cards(
            ip_count, token_count, active_token_count, 
            api_key_count, queue_count, processing_count
        ),
        "system_stats": {
            **system_stats,
            "ollama": ollama_status
        },
        "recent_activities": recent_activities
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

def get_mock_activities(username: str) -> List[Dict[str, Any]]:
    """Generate mock recent activities (would come from database in production)"""
    return [
        {"id": 1, "type": "api-key", "action": "created", "user": username, "target": "Development App", "time": "10 minutes ago"},
        {"id": 2, "type": "ip", "action": "added", "user": username, "target": "192.168.1.105", "time": "25 minutes ago"},
        {"id": 3, "type": "token", "action": "generated", "user": username, "target": "New User Invite", "time": "1 hour ago"},
        {"id": 4, "type": "queue", "action": "cleared", "user": "System", "target": "Priority 3 Queue", "time": "2 hours ago"},
        {"id": 5, "type": "api-key", "action": "revoked", "user": username, "target": "Test App", "time": "3 hours ago"}
    ]