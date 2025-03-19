from fastapi import APIRouter, Depends
import time
import logging
from typing import Dict, Any, Optional
from sqlalchemy import text, Column, String, inspect
from sqlalchemy.ext.declarative import declarative_base

try:
    import httpx
except ImportError:
    pass

from sqlalchemy.orm import Session

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

from ..db import get_db, Base
from ..auth.utils import get_current_admin_user, get_current_user
from ..auth.models import User
from ..queue import get_queue_manager, QueueManagerInterface
from ..config import settings

# Configure logging
logger = logging.getLogger("admin.system_stats")

# Create a Config model for storing system configuration
class Config(Base):
    """Database model for system configuration"""
    __tablename__ = "config"
    
    key = Column(String(100), primary_key=True)
    value = Column(String(255), nullable=True)

# Create routers
router = APIRouter(prefix="/admin/system", tags=["admin", "system"])
public_router = APIRouter(prefix="/api/system", tags=["system"])

# Helper function to ensure config table exists
def ensure_config_table_exists(db: Session):
    """Ensure the config table exists in the database"""
    try:
        # Check if config table exists, create if not
        inspector = inspect(db.bind)
        if not inspector.has_table("config"):
            logger.info("Creating config table")
            Base.metadata.tables["config"].create(db.bind)
            db.commit()
            return True
        return True
    except Exception as e:
        logger.error(f"Error ensuring config table exists: {e}")
        return False

@router.get("/models")
async def get_models(
    current_user: User = Depends(get_current_admin_user),
    queue_manager: QueueManagerInterface = Depends(get_queue_manager),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get available models from Ollama"""
    try:
        # Ensure config table exists
        ensure_config_table_exists(db)
        
        # Check if Ollama is available
        status = await queue_manager.get_status()
        ollama_connected = status.get("ollama_connected", False)
        
        if not ollama_connected:
            return {
                "models": [],
                "active_model": settings.default_model,
                "summarization_model": settings.summarization_model,
                "max_context_tokens": settings.max_context_tokens,
                "summarization_threshold": settings.summarization_threshold
            }
        
        # Get available models from Ollama
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{settings.ollama_api_url}/api/tags")
                
                if response.status_code != 200:
                    logger.error(f"Failed to fetch models from Ollama: {response.status_code}")
                    return {
                        "models": [],
                        "active_model": settings.default_model,
                        "summarization_model": settings.summarization_model,
                        "max_context_tokens": settings.max_context_tokens,
                        "summarization_threshold": settings.summarization_threshold
                    }
                
                ollama_models = response.json().get("models", [])
                
                # Check if we need to set a default model
                try:
                    # Check if we already have a default model set in DB
                    cursor = db.execute(text("SELECT value FROM config WHERE key = 'default_model'"))
                    model_from_db = cursor.fetchone()
                    
                    # If no model is set in DB and we have models available, set the first one
                    if (not model_from_db or not settings.default_model) and ollama_models:
                        first_model = ollama_models[0].get("name")
                        if first_model:
                            # Update settings
                            settings.default_model = first_model
                            logger.info(f"Using model {first_model} as default")
                            
                            # Save to DB if needed
                            if not model_from_db:
                                db.execute(
                                    text("INSERT INTO config (key, value) VALUES (:key, :value)"),
                                    {"key": "default_model", "value": first_model}
                                )
                                db.commit()
                                logger.info(f"Saved default model {first_model} to database")
                except Exception as db_error:
                    logger.error(f"Error checking/setting default model: {db_error}")
                
                # Transform to frontend format
                models = []
                for model in ollama_models:
                    models.append({
                        "name": model.get("name"),
                        "size": model.get("size", 0),
                        "modified_at": model.get("modified_at", ""),
                        "is_active": model.get("name") == settings.default_model
                    })
                
                return {
                    "models": models,
                    "active_model": settings.default_model,
                    "summarization_model": settings.summarization_model,
                    "max_context_tokens": settings.max_context_tokens,
                    "summarization_threshold": settings.summarization_threshold
                }
        except Exception as e:
            logger.error(f"Error fetching models from Ollama: {e}")
            return {
                "models": [],
                "active_model": settings.default_model,
                "summarization_model": settings.summarization_model,
                "max_context_tokens": settings.max_context_tokens,
                "summarization_threshold": settings.summarization_threshold
            }
    except Exception as e:
        logger.error(f"Error getting models: {e}")
        return {
            "models": [],
            "active_model": settings.default_model,
            "summarization_model": settings.summarization_model,
            "max_context_tokens": settings.max_context_tokens,
            "summarization_threshold": settings.summarization_threshold
        }

@router.put("/model")
async def set_active_model(
    model_data: Dict[str, str],
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Set the active model for Ollama"""
    try:
        # Ensure config table exists
        ensure_config_table_exists(db)
        
        # Extract model name from request
        model_name = model_data.get("model")
        if not model_name:
            return {
                "success": False,
                "model": settings.default_model,
                "message": "No model name provided"
            }
        
        # Validate model exists (in a production system, we'd check if the model exists in Ollama)
        # For now, we'll trust the frontend to only send valid model names
        
        # Update the default model
        settings.default_model = model_name
        
        # Also update the model in the database for persistence
        try:
            cursor = db.execute(text("SELECT COUNT(*) FROM config WHERE key = 'default_model'"))
            exists = cursor.scalar() > 0
            
            if exists:
                db.execute(
                    text("UPDATE config SET value = :value WHERE key = 'default_model'"),
                    {"value": model_name}
                )
            else:
                db.execute(
                    text("INSERT INTO config (key, value) VALUES (:key, :value)"),
                    {"key": "default_model", "value": model_name}
                )
            
            db.commit()
        except Exception as db_error:
            logger.error(f"Error updating model in database: {db_error}")
            # Continue even if database update fails - we'll still have the model in memory
        
        return {
            "success": True,
            "model": model_name,
            "message": f"Successfully set active model to {model_name}"
        }
    except Exception as e:
        logger.error(f"Error setting active model: {e}")
        return {
            "success": False,
            "model": settings.default_model,
            "message": f"Failed to set active model: {str(e)}"
        }

@router.put("/summarization-settings")
async def update_summarization_settings(
    settings_data: Dict[str, Any],
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Update summarization settings"""
    try:
        # Ensure config table exists
        ensure_config_table_exists(db)
        
        # Extract settings from request
        summarization_model = settings_data.get("summarization_model")
        max_context_tokens = settings_data.get("max_context_tokens")
        summarization_threshold = settings_data.get("summarization_threshold")
        
        if not summarization_model and not max_context_tokens and not summarization_threshold:
            return {
                "success": False,
                "message": "No settings provided to update"
            }
        
        # Update settings in memory and database
        updates_made = []
        
        # Update summarization model if provided
        if summarization_model:
            settings.summarization_model = summarization_model
            
            try:
                cursor = db.execute(text("SELECT COUNT(*) FROM config WHERE key = 'summarization_model'"))
                exists = cursor.scalar() > 0
                
                if exists:
                    db.execute(
                        text("UPDATE config SET value = :value WHERE key = 'summarization_model'"),
                        {"value": summarization_model}
                    )
                else:
                    db.execute(
                        text("INSERT INTO config (key, value, description) VALUES (:key, :value, :description)"),
                        {"key": "summarization_model", "value": summarization_model, 
                         "description": "Model used for conversation summarization"}
                    )
                
                updates_made.append("summarization_model")
            except Exception as db_error:
                logger.error(f"Error updating summarization_model in database: {db_error}")
        
        # Update max_context_tokens if provided
        if max_context_tokens is not None:
            try:
                max_tokens = int(max_context_tokens)
                settings.max_context_tokens = max_tokens
                
                cursor = db.execute(text("SELECT COUNT(*) FROM config WHERE key = 'max_context_tokens'"))
                exists = cursor.scalar() > 0
                
                if exists:
                    db.execute(
                        text("UPDATE config SET value = :value WHERE key = 'max_context_tokens'"),
                        {"value": str(max_tokens)}
                    )
                else:
                    db.execute(
                        text("INSERT INTO config (key, value, description) VALUES (:key, :value, :description)"),
                        {"key": "max_context_tokens", "value": str(max_tokens), 
                         "description": "Maximum context window size in tokens"}
                    )
                
                updates_made.append("max_context_tokens")
            except (ValueError, TypeError) as e:
                logger.error(f"Invalid max_context_tokens value: {e}")
                return {
                    "success": False,
                    "message": f"Invalid max_context_tokens value: {max_context_tokens}"
                }
        
        # Update summarization_threshold if provided
        if summarization_threshold is not None:
            try:
                threshold = int(summarization_threshold)
                if threshold < 1 or threshold > 100:
                    return {
                        "success": False,
                        "message": "summarization_threshold must be between 1 and 100"
                    }
                
                settings.summarization_threshold = threshold
                
                cursor = db.execute(text("SELECT COUNT(*) FROM config WHERE key = 'summarization_threshold'"))
                exists = cursor.scalar() > 0
                
                if exists:
                    db.execute(
                        text("UPDATE config SET value = :value WHERE key = 'summarization_threshold'"),
                        {"value": str(threshold)}
                    )
                else:
                    db.execute(
                        text("INSERT INTO config (key, value, description) VALUES (:key, :value, :description)"),
                        {"key": "summarization_threshold", "value": str(threshold), 
                         "description": "Percentage of max context at which to trigger summarization"}
                    )
                
                updates_made.append("summarization_threshold")
            except (ValueError, TypeError) as e:
                logger.error(f"Invalid summarization_threshold value: {e}")
                return {
                    "success": False,
                    "message": f"Invalid summarization_threshold value: {summarization_threshold}"
                }
        
        # Commit all changes
        db.commit()
        
        return {
            "success": True,
            "updates": updates_made,
            "message": f"Successfully updated summarization settings: {', '.join(updates_made)}",
            "current_settings": {
                "summarization_model": settings.summarization_model,
                "max_context_tokens": settings.max_context_tokens,
                "summarization_threshold": settings.summarization_threshold
            }
        }
    except Exception as e:
        logger.error(f"Error updating summarization settings: {e}")
        return {
            "success": False,
            "message": f"Failed to update summarization settings: {str(e)}"
        }

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
                if output:
                    lines = output.split('\n')
                    if len(lines) > 1:
                        cpu_model = lines[1].strip()
        except Exception as e:
            logger.error(f"Error getting CPU model: {e}")
        
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
        # Memory usage
        mem = psutil.virtual_memory()
        
        # Convert to GB
        total_gb = mem.total / (1024**3)
        used_gb = mem.used / (1024**3)
        
        return {
            "total": round(total_gb, 1),
            "used": round(used_gb, 1),
            "percentage": mem.percent
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
    """Get network information with improved error handling"""
    if not PSUTIL_AVAILABLE:
        return {"incoming": 0, "outgoing": 0, "connections": 0}
    
    try:
        # Network io counters
        net_io = psutil.net_io_counters()
        
        # Network connections with timeout and error handling
        connections = 0
        try:
            # This is the call that often fails on WSL or with permission issues on Mac/Docker
            # We'll wrap it in a separate try/except to prevent it from failing the whole function
            connections = len(psutil.net_connections(kind='inet'))
        except (PermissionError, OSError) as conn_err:
            # Common errors on non-root, WSL, or container environments
            logger.warning(f"Could not get network connections (permissions): {conn_err}")
        except Exception as conn_err:
            # Handle any other errors
            logger.warning(f"Unexpected error getting network connections: {conn_err}")
            
        # Continue with other network stats even if connections fail
        
        # Estimate throughput (this is just an estimation)
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

# Create a public endpoint for basic system info that doesn't require admin access
@public_router.get("/model-info")
async def get_public_model_info(
    queue_manager: QueueManagerInterface = Depends(get_queue_manager)
) -> Dict[str, Any]:
    """Get basic model information for chat interface"""
    try:
        # Get queue status
        status = await queue_manager.get_status()
        ollama_connected = status.get("ollama_connected", False)
        
        return {
            "status": "online" if ollama_connected else "offline",
            "model": settings.default_model,
            "online": ollama_connected
        }
    except Exception as e:
        logger.error(f"Error getting public model info: {e}")
        return {
            "status": "offline",
            "model": settings.default_model,
            "online": False
        }