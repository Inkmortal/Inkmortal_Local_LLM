from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, Any
import httpx
import json
import os
import asyncio
from dotenv import load_dotenv

from ..db import get_db
from ..auth.utils import get_current_user, validate_api_key, get_current_admin_user
from ..auth.models import User
from ..queue import QueuedRequest, RequestPriority  # Use the __init__.py exports
from ..queue.rabbitmq.manager import get_queue_manager  # Import the getter function

# Load environment variables
load_dotenv()

# Get Ollama API URL from environment or use default
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434")

# Create router
router = APIRouter(prefix="/api", tags=["api"])

# Create a FastAPI dependency for the queue manager
async def get_queue():
    """Get the queue manager instance"""
    queue_manager = get_queue_manager()
    # Ensure the manager is connected
    await queue_manager.ensure_connected()
    return queue_manager

# Helper function to determine request priority
async def get_request_priority(
    request: Request,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Determine the priority of a request based on authentication method:
    - API Key (X-API-Key header): Priority from API key settings
    - JWT Token (Authorization header): Priority 3 (web interface)
    - IP Whitelist: Priority 1 (direct API)
    """
    # Check for API key
    api_key = request.headers.get("X-API-Key")
    if api_key:
        try:
            # Validate API key and get priority
            api_key_data = await validate_api_key(api_key, db)
            return {
                "priority": api_key_data["priority"],
                "user": api_key_data["user"],
                "auth_type": "api_key"
            }
        except HTTPException:
            pass  # If API key is invalid, continue to other auth methods
    
    # Check for JWT token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        # Web interface users get priority 3
        try:
            # This will raise an exception if token is invalid
            user = await get_current_user(auth_header.replace("Bearer ", ""), db)
            return {
                "priority": RequestPriority.WEB_INTERFACE,  # Use enum
                "user": user,
                "auth_type": "jwt"
            }
        except HTTPException:
            pass  # If JWT is invalid, continue to IP whitelist check
    
    # Check IP whitelist (for direct API access)
    client_ip = request.client.host
    # TODO: Implement proper IP whitelist check from database (using a model)
    whitelisted_ips = os.getenv("WHITELISTED_IPS", "127.0.0.1").split(",")
    
    if client_ip in whitelisted_ips:
        return {
            "priority": RequestPriority.DIRECT_API,  # Use enum
            "user": None,  # No user associated with IP whitelist
            "auth_type": "ip_whitelist"
        }
    
    # If no valid authentication method, raise exception
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"}
    )

# Ollama API proxy endpoint for chat completions
@router.post("/chat/completions")
async def chat_completions(
    request: Request,
    priority_data: Dict[str, Any] = Depends(get_request_priority),
    queue_manager = Depends(get_queue),
    db: Session = Depends(get_db)
):
    """
    Proxy endpoint for Ollama chat completions API
    Compatible with OpenAI API format
    """
    # Get request body
    body = await request.json()
    
    # Extract model from request
    model = body.get("model", "llama3.3:70b")
    
    # Create a request object for the queue
    request_obj = QueuedRequest(
        priority=priority_data["priority"],
        endpoint="/api/chat/completions",
        body=body,
        user_id=priority_data["user"].id if priority_data["user"] else None,
        auth_type=priority_data["auth_type"]
    )
    
    # Add request to queue and get position
    position = await queue_manager.add_request(request_obj)
    
    # If streaming is requested
    if body.get("stream", False):
        # Get the next request from the queue and process it
        next_request = await queue_manager.get_next_request()
        if next_request and next_request.timestamp == request_obj.timestamp:
            return StreamingResponse(
                queue_manager.processor.process_streaming_request(next_request),
                media_type="text/event-stream"
            )
        else:
            # If request wasn't found in queue, return error
            async def error_stream():
                yield json.dumps({"error": "Request not found in queue"}).encode()
            
            return StreamingResponse(
                error_stream(),
                media_type="text/event-stream"
            )
    
    # For non-streaming requests
    # Add timeout to prevent hanging
    timeout_seconds = 60.0  # 1 minute timeout for waiting in queue
    start_time = asyncio.get_event_loop().time()
    
    while asyncio.get_event_loop().time() - start_time < timeout_seconds:
        if not queue_manager.processor.current_request:
            next_request = await queue_manager.get_next_request()
            if next_request and next_request.timestamp == request_obj.timestamp:
                return await queue_manager.process_request(next_request)
        await asyncio.sleep(0.1)
    
    # If we reach here, we timed out waiting for the request
    return {"error": f"Request timed out after {timeout_seconds} seconds in queue"}

# Ollama API proxy endpoint for completions
@router.post("/completions")
async def completions(
    request: Request,
    priority_data: Dict[str, Any] = Depends(get_request_priority),
    queue_manager = Depends(get_queue),
    db: Session = Depends(get_db)
):
    """
    Proxy endpoint for Ollama completions API
    Compatible with OpenAI API format
    """
    # Get request body
    body = await request.json()
    
    # Extract model from request
    model = body.get("model", "llama3.3:70b")
    
    # Create a request object for the queue
    request_obj = QueuedRequest(
        priority=priority_data["priority"],
        endpoint="/api/completions",
        body=body,
        user_id=priority_data["user"].id if priority_data["user"] else None,
        auth_type=priority_data["auth_type"]
    )
    
    # Add request to queue and get position
    position = await queue_manager.add_request(request_obj)
    
    # If streaming is requested
    if body.get("stream", False):
        # Get the next request from the queue and process it
        next_request = await queue_manager.get_next_request()
        if next_request and next_request.timestamp == request_obj.timestamp:
            return StreamingResponse(
                queue_manager.processor.process_streaming_request(next_request),
                media_type="text/event-stream"
            )
        else:
            # If request wasn't found in queue, return error
            async def error_stream():
                yield json.dumps({"error": "Request not found in queue"}).encode()
            
            return StreamingResponse(
                error_stream(),
                media_type="text/event-stream"
            )
    
    # For non-streaming requests
    # Add timeout to prevent hanging
    timeout_seconds = 60.0  # 1 minute timeout for waiting in queue
    start_time = asyncio.get_event_loop().time()
    
    while asyncio.get_event_loop().time() - start_time < timeout_seconds:
        if not queue_manager.processor.current_request:
            next_request = await queue_manager.get_next_request()
            if next_request and next_request.timestamp == request_obj.timestamp:
                return await queue_manager.process_request(next_request)
        await asyncio.sleep(0.1)
    
    # If we reach here, we timed out waiting for the request
    return {"error": f"Request timed out after {timeout_seconds} seconds in queue"}

# Get available models
@router.get("/models")
async def list_models(
    priority_data: Dict[str, Any] = Depends(get_request_priority),
    db: Session = Depends(get_db)
):
    """List available models from Ollama"""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{OLLAMA_API_URL}/api/tags")
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail="Failed to fetch models from Ollama"
            )
        
        # Transform Ollama response to OpenAI-like format
        ollama_models = response.json().get("models", [])
        openai_format_models = []
        
        for model in ollama_models:
            openai_format_models.append({
                "id": model.get("name"),
                "object": "model",
                "created": 0,  # Ollama doesn't provide creation time
                "owned_by": "ollama"
            })
        
        return {"data": openai_format_models}

# Queue status endpoint
@router.get("/queue/status")
async def queue_status(
    current_user: User = Depends(get_current_user),
    queue_manager = Depends(get_queue)
):
    """Get current queue status (authenticated users only)"""
    status = await queue_manager.get_status()
    return status

# Admin-only queue management endpoints
@router.post("/queue/clear")
async def clear_queue(
    current_user: User = Depends(get_current_admin_user),
    queue_manager = Depends(get_queue)
):
    """Clear the queue (admin only)"""
    await queue_manager.clear_queue()
    return {"message": "Queue cleared successfully"}

# Health check endpoint
@router.get("/health")
async def api_health(queue_manager = Depends(get_queue)):
    """Check API gateway health"""
    # Check Ollama connection
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{OLLAMA_API_URL}/api/tags")
            ollama_status = response.status_code == 200
    except:
        ollama_status = False
    
    # Check RabbitMQ connection
    try:
        status = await queue_manager.get_status()
        rabbitmq_status = status["rabbitmq_connected"]
    except:
        rabbitmq_status = False
    
    return {
        "status": "healthy" if (ollama_status and rabbitmq_status) else "degraded",
        "ollama_connected": ollama_status,
        "rabbitmq_connected": rabbitmq_status
    }