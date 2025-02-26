import pytest
import asyncio
import time
from fastapi import status
from app.queue import RequestPriority, QueuedRequest

async def wait_for_queue_size(queue_manager, expected_total: int, timeout: float = 5.0) -> bool:
    """Wait for queue to reach expected size"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        sizes = await queue_manager.get_queue_size()
        if sum(sizes.values()) == expected_total:
            return True
        await asyncio.sleep(0.1)
    return False

@pytest.mark.asyncio
async def test_queue_priority_ordering(queue_manager):
    """Test that requests are processed in priority order"""
    # Add requests with different priorities
    await queue_manager.add_request(QueuedRequest(
        priority=RequestPriority.WEB_INTERFACE,
        endpoint="/test",
        body={"message": "web"}
    ))
    
    await queue_manager.add_request(QueuedRequest(
        priority=RequestPriority.DIRECT_API,
        endpoint="/test",
        body={"message": "direct"}
    ))
    
    await queue_manager.add_request(QueuedRequest(
        priority=RequestPriority.CUSTOM_APP,
        endpoint="/test",
        body={"message": "custom"}
    ))
    
    # Wait for messages to be queued
    assert await wait_for_queue_size(queue_manager, 3)
    
    # Check queue sizes
    sizes = await queue_manager.get_queue_size()
    assert sizes[RequestPriority.DIRECT_API] == 1
    assert sizes[RequestPriority.CUSTOM_APP] == 1
    assert sizes[RequestPriority.WEB_INTERFACE] == 1
    
    # Get next request - should be DIRECT_API
    next_request = await queue_manager.get_next_request()
    assert next_request is not None
    assert next_request.priority == RequestPriority.DIRECT_API
    
    # Get next request - should be CUSTOM_APP
    next_request = await queue_manager.get_next_request()
    assert next_request is not None
    assert next_request.priority == RequestPriority.CUSTOM_APP
    
    # Get next request - should be WEB_INTERFACE
    next_request = await queue_manager.get_next_request()
    assert next_request is not None
    assert next_request.priority == RequestPriority.WEB_INTERFACE

@pytest.mark.asyncio
async def test_request_aging(queue_manager):
    """Test that old requests get promoted"""
    # Add a web interface request
    request = QueuedRequest(
        priority=RequestPriority.WEB_INTERFACE,
        endpoint="/test",
        body={"message": "old"}
    )
    await queue_manager.add_request(request)
    
    # Wait for message to be queued
    assert await wait_for_queue_size(queue_manager, 1)
    
    # Wait for aging to occur
    await asyncio.sleep(queue_manager.aging_threshold_seconds + 1)
    
    # Wait for promotion
    await asyncio.sleep(1)
    
    # Check that request was promoted
    sizes = await queue_manager.get_queue_size()
    assert sizes[RequestPriority.DIRECT_API] == 1
    assert sizes[RequestPriority.WEB_INTERFACE] == 0

@pytest.mark.asyncio
async def test_request_processing(queue_manager):
    """Test processing a request"""
    # Add a request
    request = QueuedRequest(
        priority=RequestPriority.DIRECT_API,
        endpoint="/api/chat/completions",
        body={
            "model": "llama3:70b",
            "messages": [{"role": "user", "content": "Hello"}]
        }
    )
    
    await queue_manager.add_request(request)
    
    # Wait for message to be queued
    assert await wait_for_queue_size(queue_manager, 1)
    
    # Process the request
    response = await queue_manager.process_request(request)
    
    # Check response format
    assert isinstance(response, dict)
    
    # Check stats
    stats = await queue_manager.get_stats()
    assert stats.total_requests == 1
    assert stats.completed_requests == 1

@pytest.mark.asyncio
async def test_queue_clear(queue_manager):
    """Test clearing the queue"""
    # Add some requests
    await queue_manager.add_request(QueuedRequest(
        priority=RequestPriority.WEB_INTERFACE,
        endpoint="/test",
        body={"message": "web"}
    ))
    
    await queue_manager.add_request(QueuedRequest(
        priority=RequestPriority.DIRECT_API,
        endpoint="/test",
        body={"message": "direct"}
    ))
    
    # Wait for messages to be queued
    assert await wait_for_queue_size(queue_manager, 2)
    
    # Check queue sizes
    sizes = await queue_manager.get_queue_size()
    assert sum(sizes.values()) == 2
    
    # Clear queue
    await queue_manager.clear_queue()
    
    # Wait for queues to be empty
    assert await wait_for_queue_size(queue_manager, 0)

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
    
    # Wait for message to be queued
    assert await wait_for_queue_size(queue_manager, 1)
    
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
    
    # Wait for message to be queued
    assert await wait_for_queue_size(queue_manager, 1)
    
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
    await queue_manager.add_request(QueuedRequest(
        priority=RequestPriority.WEB_INTERFACE,
        endpoint="/test",
        body={"message": "test"}
    ))
    
    # Wait for message to be queued
    assert await wait_for_queue_size(queue_manager, 1)
    
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
    await queue_manager.add_request(QueuedRequest(
        priority=RequestPriority.WEB_INTERFACE,
        endpoint="/test",
        body={"message": "test"}
    ))
    
    # Wait for message to be queued
    assert await wait_for_queue_size(queue_manager, 1)
    
    # Regular user cannot clear queue
    response = client.post("/api/queue/clear", headers=auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    
    # Admin can clear queue
    response = client.post("/api/queue/clear", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    
    # Wait for queue to be empty
    assert await wait_for_queue_size(queue_manager, 0)