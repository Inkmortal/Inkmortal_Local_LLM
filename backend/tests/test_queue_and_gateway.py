import pytest
import asyncio
from unittest.mock import patch, MagicMock
from fastapi import status
from app.queue.rabbitmq_manager import RabbitMQManager, RequestPriority
import time
import json
from .mock_rabbitmq import mock_rabbitmq_connect

@pytest.fixture
async def mock_rabbitmq():
    """Set up mock RabbitMQ for testing"""
    connection = await mock_rabbitmq_connect()
    yield connection

@pytest.fixture
async def queue_manager(mock_rabbitmq):
    """Get a fresh queue manager instance with mock RabbitMQ"""
    manager = RabbitMQManager()
    # Wait for connection to be established
    await asyncio.sleep(0.1)
    # Clear any existing queues
    await manager.clear_queue()
    return manager

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
async def test_request_processing(queue_manager):
    """Test processing a request"""
    # Add a request
    request = {
        "priority": RequestPriority.DIRECT_API,
        "timestamp": time.time(),
        "endpoint": "/api/chat/completions",
        "body": {"model": "llama3:70b", "messages": [{"role": "user", "content": "Hello"}]}
    }
    
    await queue_manager.add_request(request)
    
    # Mock Ollama response
    with patch('httpx.AsyncClient.post') as mock_post:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"message": "test response"}
        mock_post.return_value = mock_response
        
        # Process the request
        response = await queue_manager.process_request(request)
        
        # Check response
        assert response == {"message": "test response"}
        
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
        json={"model": "llama3:70b", "messages": [{"role": "user", "content": "Hello"}]}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_api_gateway_with_api_key(client, test_api_key, mock_rabbitmq):
    """Test API gateway access with API key"""
    # Mock queue manager's add_request and process_request methods
    with patch('app.queue.rabbitmq_manager.RabbitMQManager.add_request') as mock_add_request, \
         patch('app.queue.rabbitmq_manager.RabbitMQManager.process_request') as mock_process_request:
        
        # Set up mocks
        mock_add_request.return_value = 0
        mock_process_request.return_value = {"message": "test response"}
        
        # Make request
        response = client.post(
            "/api/chat/completions",
            json={
                "model": "llama3:70b",
                "messages": [{"role": "user", "content": "Hello"}]
            },
            headers={"X-API-Key": test_api_key.key}
        )
        
        # Check response
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"message": "test response"}
        
        # Check that add_request was called with correct priority
        args, kwargs = mock_add_request.call_args
        assert args[0]["priority"] == test_api_key.priority

@pytest.mark.asyncio
async def test_api_gateway_with_jwt(client, auth_headers, mock_rabbitmq):
    """Test API gateway access with JWT token"""
    # Mock queue manager's add_request and process_request methods
    with patch('app.queue.rabbitmq_manager.RabbitMQManager.add_request') as mock_add_request, \
         patch('app.queue.rabbitmq_manager.RabbitMQManager.process_request') as mock_process_request:
        
        # Set up mocks
        mock_add_request.return_value = 0
        mock_process_request.return_value = {"message": "test response"}
        
        # Make request
        response = client.post(
            "/api/chat/completions",
            json={
                "model": "llama3:70b",
                "messages": [{"role": "user", "content": "Hello"}]
            },
            headers=auth_headers
        )
        
        # Check response
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"message": "test response"}
        
        # Check that add_request was called with correct priority
        args, kwargs = mock_add_request.call_args
        assert args[0]["priority"] == RequestPriority.WEB_INTERFACE

@pytest.mark.asyncio
async def test_api_gateway_models_endpoint(client, auth_headers, mock_rabbitmq):
    """Test listing available models"""
    with patch('httpx.AsyncClient.get') as mock_get:
        # Mock Ollama response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "models": [
                {"name": "llama3:70b"},
                {"name": "codellama:34b"}
            ]
        }
        mock_get.return_value = mock_response
        
        # Make request
        response = client.get("/api/models", headers=auth_headers)
        
        # Check response
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data
        assert len(data["data"]) == 2
        assert data["data"][0]["id"] == "llama3:70b"

@pytest.mark.asyncio
async def test_queue_status(client, auth_headers, mock_rabbitmq):
    """Test getting queue status"""
    # Mock get_status method
    with patch('app.queue.rabbitmq_manager.RabbitMQManager.get_status') as mock_get_status:
        mock_get_status.return_value = {
            "queue_size": 2,
            "queue_by_priority": {1: 1, 2: 1, 3: 0},
            "current_request": None,
            "stats": {
                "total_requests": 10,
                "completed_requests": 8,
                "failed_requests": 0,
                "avg_wait_time": 0.5,
                "avg_processing_time": 2.0
            },
            "rabbitmq_connected": True
        }
        
        # Make request
        response = client.get("/api/queue/status", headers=auth_headers)
        
        # Check response
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["queue_size"] == 2
        assert data["stats"]["total_requests"] == 10
        assert data["rabbitmq_connected"] == True

@pytest.mark.asyncio
async def test_clear_queue_admin_only(client, auth_headers, admin_headers, mock_rabbitmq):
    """Test that only admins can clear the queue"""
    # Mock clear_queue method
    with patch('app.queue.rabbitmq_manager.RabbitMQManager.clear_queue') as mock_clear_queue:
        # Regular user cannot clear queue
        response = client.post("/api/queue/clear", headers=auth_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert not mock_clear_queue.called
        
        # Admin can clear queue
        response = client.post("/api/queue/clear", headers=admin_headers)
        assert response.status_code == status.HTTP_200_OK
        assert mock_clear_queue.called