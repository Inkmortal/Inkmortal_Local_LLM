import pytest
import time
from fastapi import status
from app.queue.rabbitmq_manager import RequestPriority
import json

@pytest.mark.asyncio
async def test_queue_priority_ordering(queue_manager):
    """Test that requests are processed in priority order"""
    # Add requests with different priorities
    await queue_manager.add_request({
        "priority": RequestPriority.WEB_INTERFACE,
        "timestamp": time.time(),
        "endpoint": "/test",
        "body": {"message": "web"}
    })
    
    await queue_manager.add_request({
        "priority": RequestPriority.DIRECT_API,
        "timestamp": time.time(),
        "endpoint": "/test",
        "body": {"message": "direct"}
    })
    
    await queue_manager.add_request({
        "priority": RequestPriority.CUSTOM_APP,
        "timestamp": time.time(),
        "endpoint": "/test",
        "body": {"message": "custom"}
    })
    
    # Check queue sizes
    sizes = await queue_manager.get_queue_size()
    assert sizes[RequestPriority.DIRECT_API] == 1
    assert sizes[RequestPriority.CUSTOM_APP] == 1
    assert sizes[RequestPriority.WEB_INTERFACE] == 1
    
    # Get next request - should be DIRECT_API
    next_request = await queue_manager.get_next_request()
    assert next_request["priority"] == RequestPriority.DIRECT_API
    
    # Get next request - should be CUSTOM_APP
    next_request = await queue_manager.get_next_request()
    assert next_request["priority"] == RequestPriority.CUSTOM_APP
    
    # Get next request - should be WEB_INTERFACE
    next_request = await queue_manager.get_next_request()
    assert next_request["priority"] == RequestPriority.WEB_INTERFACE

@pytest.mark.asyncio
async def test_request_aging(queue_manager):
    """Test that old requests get promoted"""
    # Add a web interface request
    current_time = time.time()
    old_request = {
        "priority": RequestPriority.WEB_INTERFACE,
        "timestamp": current_time - 60,  # 60 seconds old
        "endpoint": "/test",
        "body": {"message": "old"}
    }
    await queue_manager.add_request(old_request)
    
    # Wait for aging to occur
    await asyncio.sleep(queue_manager.aging_threshold_seconds + 1)
    
    # Check that request was promoted
    sizes = await queue_manager.get_queue_size()
    assert sizes[RequestPriority.DIRECT_API] == 1
    assert sizes[RequestPriority.WEB_INTERFACE] == 0

@pytest.mark.asyncio
async def test_request_processing(queue_manager):
    """Test processing a request"""
    # Add a request
    request = {
        "priority": RequestPriority.DIRECT_API,
        "timestamp": time.time(),
        "endpoint": "/api/chat/completions",
        "body": {
            "model": "llama3:70b",
            "messages": [{"role": "user", "content": "Hello"}]
        }
    }
    
    await queue_manager.add_request(request)
    
    # Process the request
    response = await queue_manager.process_request(request)
    
    # Check response format
    assert isinstance(response, dict)
    
    # Check stats
    assert queue_manager.stats["total_requests"] == 1
    assert queue_manager.stats["completed_requests"] == 1

@pytest.mark.asyncio
async def test_queue_clear(queue_manager):
    """Test clearing the queue"""
    # Add some requests
    await queue_manager.add_request({
        "priority": RequestPriority.WEB_INTERFACE,
        "timestamp": time.time(),
        "endpoint": "/test",
        "body": {"message": "web"}
    })
    
    await queue_manager.add_request({
        "priority": RequestPriority.DIRECT_API,
        "timestamp": time.time(),
        "endpoint": "/test",
        "body": {"message": "direct"}
    })
    
    # Check queue sizes
    sizes = await queue_manager.get_queue_size()
    assert sum(sizes.values()) == 2
    
    # Clear queue
    await queue_manager.clear_queue()
    
    # Check queue sizes again
    sizes = await queue_manager.get_queue_size()
    assert sum(sizes.values()) == 0

def test_api_gateway_auth_required(client):
    """Test that API gateway endpoints require authentication"""
    response = client.post(
        "/api/chat/completions",
        json={
            "model": "llama3:70b",
            "messages": [{"role": "user", "content": "Hello"}]
        }
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_api_gateway_with_api_key(client, test_api_key, queue_manager):
    """Test API gateway access with API key"""
    response = client.post(
        "/api/chat/completions",
        json={
            "model": "llama3:70b",
            "messages": [{"role": "user", "content": "Hello"}]
        },
        headers={"X-API-Key": test_api_key.key}
    )
    
    assert response.status_code == status.HTTP_200_OK
    
    # Check that request was queued with correct priority
    sizes = await queue_manager.get_queue_size()
    assert sizes[test_api_key.priority] >= 1

@pytest.mark.asyncio
async def test_api_gateway_with_jwt(client, auth_headers, queue_manager):
    """Test API gateway access with JWT token"""
    response = client.post(
        "/api/chat/completions",
        json={
            "model": "llama3:70b",
            "messages": [{"role": "user", "content": "Hello"}]
        },
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    
    # Check that request was queued with web interface priority
    sizes = await queue_manager.get_queue_size()
    assert sizes[RequestPriority.WEB_INTERFACE] >= 1

@pytest.mark.asyncio
async def test_api_gateway_models_endpoint(client, auth_headers):
    """Test listing available models"""
    response = client.get("/api/models", headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], list)
    assert len(data["data"]) > 0
    assert "id" in data["data"][0]

@pytest.mark.asyncio
async def test_queue_status(client, auth_headers, queue_manager):
    """Test getting queue status"""
    # Add a request to check in status
    await queue_manager.add_request({
        "priority": RequestPriority.WEB_INTERFACE,
        "timestamp": time.time(),
        "endpoint": "/test",
        "body": {"message": "test"}
    })
    
    response = client.get("/api/queue/status", headers=auth_headers)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "queue_size" in data
    assert "queue_by_priority" in data
    assert "stats" in data
    assert data["queue_size"] >= 1

@pytest.mark.asyncio
async def test_clear_queue_admin_only(client, auth_headers, admin_headers, queue_manager):
    """Test that only admins can clear the queue"""
    # Add a request
    await queue_manager.add_request({
        "priority": RequestPriority.WEB_INTERFACE,
        "timestamp": time.time(),
        "endpoint": "/test",
        "body": {"message": "test"}
    })
    
    # Regular user cannot clear queue
    response = client.post("/api/queue/clear", headers=auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    
    # Admin can clear queue
    response = client.post("/api/queue/clear", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    
    # Queue should be empty
    sizes = await queue_manager.get_queue_size()
    assert sum(sizes.values()) == 0