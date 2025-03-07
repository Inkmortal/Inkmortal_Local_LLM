"""
System statistics endpoints for admin panel
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import Dict, Any, Optional, List
import logging
import time
import requests
from datetime import datetime
from sqlalchemy.orm import Session

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

from ..db import get_db
from ..auth.utils import get_current_admin_user
from ..auth.models import User
from ..queue import get_queue_manager, QueueManagerInterface
from ..config import settings

# Configure logging
logger = logging.getLogger("admin.system_stats")

# Create router
router = APIRouter(prefix="/admin/system", tags=["admin", "system"])

@router.get("/stats")
async def get_system_stats(
    current_user: User = Depends(get_current_admin_user),
    queue_manager: QueueManagerInterface = Depends(get_queue_manager)
) -> Dict[str, Any]:
    """Get detailed system statistics"""
    try:
        # CPU info
        cpu_info = get_cpu_info()
        
        # Memory info
        memory_info = get_memory_info()
        
        # Storage info
        storage_info = get_storage_info()
        
        # Network info
        network_info = get_network_info()
        
        # Uptime info
        uptime_info = get_uptime_info()
        
        # Ollama info
        ollama_info = await get_ollama_info(queue_manager)
        
        return {
            "cpu": cpu_info,
            "memory": memory_info,
            "storage": storage_info,
            "network": network_info,
            "uptime": uptime_info,
            "ollama": ollama_info
        }
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        # Return a minimal response with default values
        return {
            "cpu": {"usage": 0, "cores": 0, "model": "Unknown"},
            "memory": {"total": 0, "used": 0, "percentage": 0},
            "storage": {"total": 0, "used": 0, "percentage": 0},
            "network": {"incoming": 0, "outgoing": 0, "connections": 0},
            "uptime": {"days": 0, "hours": 0, "minutes": 0},
            "ollama": {
                "status": "Offline",
                "model": settings.default_model,
                "version": "Unknown",
                "requests": 0,
                "avgResponseTime": 0
            }
        }

def get_cpu_info() -> Dict[str, Any]:
    """Get CPU information"""
    if not PSUTIL_AVAILABLE:
        return {"usage": 0, "cores": 0, "model": "Unknown"}
    
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=0.5)
        
        # CPU cores
        cpu_count = psutil.cpu_count(logical=True)
        
        # CPU model (platform dependent)
        cpu_model = "Unknown"
        try:
            import platform
            if platform.system() == "Linux":
                with open("/proc/cpuinfo") as f:
                    for line in f:
                        if line.strip().startswith("model name"):
                            cpu_model = line.split(":")[1].strip()
                            break
            elif platform.system() == "Darwin":  # macOS
                import subprocess
                output = subprocess.check_output(["sysctl", "-n", "machdep.cpu.brand_string"]).decode().strip()
                cpu_model = output
            elif platform.system() == "Windows":
                import subprocess
                output = subprocess.check_output(["wmic", "cpu", "get", "name"]).decode().strip()
                lines = output.split("\n")
                if len(lines) > 1:
                    cpu_model = lines[1].strip()
        except Exception as e:
            logger.error(f"Error getting CPU model: {e}")
            cpu_model = "Unknown"
        
        return {
            "usage": cpu_percent,
            "cores": cpu_count,
            "model": cpu_model
        }
    except Exception as e:
        logger.error(f"Error getting CPU info: {e}")
        return {"usage": 0, "cores": 0, "model": "Unknown"}

def get_memory_info() -> Dict[str, Any]:
    """Get memory information"""
    if not PSUTIL_AVAILABLE:
        return {"total": 0, "used": 0, "percentage": 0}
    
    try:
        # Memory info
        memory = psutil.virtual_memory()
        
        # Convert to GB
        total_gb = memory.total / (1024**3)
        used_gb = memory.used / (1024**3)
        
        return {
            "total": round(total_gb),
            "used": round(used_gb, 1),
            "percentage": memory.percent
        }
    except Exception as e:
        logger.error(f"Error getting memory info: {e}")
        return {"total": 0, "used": 0, "percentage": 0}

def get_storage_info() -> Dict[str, Any]:
    """Get storage information"""
    if not PSUTIL_AVAILABLE:
        return {"total": 0, "used": 0, "percentage": 0}
    
    try:
        # Disk usage for root path
        disk = psutil.disk_usage('/')
        
        # Convert to GB
        total_gb = disk.total / (1024**3)
        used_gb = disk.used / (1024**3)
        
        return {
            "total": round(total_gb),
            "used": round(used_gb),
            "percentage": disk.percent
        }
    except Exception as e:
        logger.error(f"Error getting storage info: {e}")
        return {"total": 0, "used": 0, "percentage": 0}

def get_network_info() -> Dict[str, Any]:
    """Get network information"""
    if not PSUTIL_AVAILABLE:
        return {"incoming": 0, "outgoing": 0, "connections": 0}
    
    try:
        # Network io counters
        net_io = psutil.net_io_counters()
        
        # Network connections
        connections = len(psutil.net_connections())
        
        # Estimate throughput (this is just an estimation)
        # For real-time values, you would need to calculate deltas over time
        incoming = round(net_io.bytes_recv / 1024 / 1024, 1)  # Convert to MB
        outgoing = round(net_io.bytes_sent / 1024 / 1024, 1)  # Convert to MB
        
        # Divide by uptime to get per-second rate
        uptime = time.time() - psutil.boot_time()
        if uptime > 0:
            incoming = round(incoming / uptime, 1)
            outgoing = round(outgoing / uptime, 1)
        
        return {
            "incoming": incoming,
            "outgoing": outgoing,
            "connections": connections
        }
    except Exception as e:
        logger.error(f"Error getting network info: {e}")
        return {"incoming": 0, "outgoing": 0, "connections": 0}

def get_uptime_info() -> Dict[str, Any]:
    """Get system uptime information"""
    if not PSUTIL_AVAILABLE:
        return {"days": 0, "hours": 0, "minutes": 0}
    
    try:
        # System uptime
        uptime_seconds = time.time() - psutil.boot_time()
        days, remainder = divmod(uptime_seconds, 86400)
        hours, remainder = divmod(remainder, 3600)
        minutes, _ = divmod(remainder, 60)
        
        return {
            "days": int(days),
            "hours": int(hours),
            "minutes": int(minutes)
        }
    except Exception as e:
        logger.error(f"Error getting uptime info: {e}")
        return {"days": 0, "hours": 0, "minutes": 0}

async def get_ollama_info(queue_manager: QueueManagerInterface) -> Dict[str, Any]:
    """Get Ollama statistics"""
    try:
        # Get queue status (includes Ollama info)
        status = await queue_manager.get_status()
        ollama_connected = status.get("ollama_connected", False)
        
        # Get queue stats
        stats = await queue_manager.get_stats()
        
        # Get total requests from stats
        total_requests = stats.total_requests
        
        # Calculate average response time
        avg_response_time = stats.avg_processing_time
        
        return {
            "status": "Running" if ollama_connected else "Offline",
            "model": settings.default_model,
            "version": "0.2.1",  # This should be dynamic in production
            "requests": total_requests,
            "avgResponseTime": round(avg_response_time, 1) if avg_response_time else 0
        }
    except Exception as e:
        logger.error(f"Error getting Ollama info: {e}")
        return {
            "status": "Offline",
            "model": settings.default_model,
            "version": "Unknown",
            "requests": 0,
            "avgResponseTime": 0
        }

async def get_available_models() -> List[Dict[str, Any]]:
    """Get list of available models from Ollama"""
    try:
        # Call Ollama API to get available models
        response = requests.get(f"{settings.ollama_api_url}/api/tags")
        if response.status_code != 200:
            logger.error(f"Failed to get models from Ollama: Status {response.status_code}")
            return []
        
        models_data = response.json()
        models = []
        
        # Process model data from Ollama response
        for model in models_data.get("models", []):
            model_name = model.get("name")
            # Add only if model name exists
            if model_name:
                model_info = {
                    "name": model_name,
                    "size": model.get("size", 0),
                    "modified_at": model.get("modified_at", ""),
                    "is_active": model_name == settings.default_model
                }
                models.append(model_info)
        
        # Sort models by name
        models.sort(key=lambda x: x["name"])
        return models
    except Exception as e:
        logger.error(f"Error fetching available models: {e}")
        return []
        
@router.get("/models")
async def list_models(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """List available models from Ollama (admin only)"""
    try:
        models = await get_available_models()
        return {
            "models": models,
            "active_model": settings.default_model
        }
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list models: {str(e)}"
        )

@router.put("/model")
async def set_active_model(
    model_data: Dict[str, str] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Set the active model with persistence (admin only)"""
    model_name = model_data.get("model")
    if not model_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Model name is required"
        )
    
    try:
        # Verify model exists in Ollama
        models = await get_available_models()
        model_exists = any(model["name"] == model_name for model in models)
        
        if not model_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model '{model_name}' not found in Ollama"
            )
        
        # Update the settings in memory
        settings.default_model = model_name
        
        # Create or update the persistent setting in the database
        try:
            # Check if CONFIG table exists, if not create it
            if not db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='config'").fetchone():
                db.execute("CREATE TABLE config (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
                db.commit()
                logger.info("Created config table for persistent settings")
            
            # Check if default_model setting exists
            existing = db.execute("SELECT value FROM config WHERE key = 'default_model'").fetchone()
            
            if existing:
                # Update existing setting
                db.execute(
                    "UPDATE config SET value = :value, updated_at = CURRENT_TIMESTAMP WHERE key = 'default_model'", 
                    {"value": model_name}
                )
                logger.info(f"Updated default_model setting to {model_name}")
            else:
                # Insert new setting
                db.execute(
                    "INSERT INTO config (key, value) VALUES ('default_model', :value)",
                    {"value": model_name}
                )
                logger.info(f"Created default_model setting with value {model_name}")
            
            db.commit()
            
            return {
                "success": True,
                "model": model_name,
                "message": "Model updated successfully and saved to database"
            }
        except Exception as db_error:
            logger.error(f"Database error saving model setting: {str(db_error)}")
            
            # We already updated the in-memory setting, so return partial success
            return {
                "success": True,
                "model": model_name,
                "message": "Model updated in memory, but failed to persist to database"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting active model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set active model: {str(e)}"
        )