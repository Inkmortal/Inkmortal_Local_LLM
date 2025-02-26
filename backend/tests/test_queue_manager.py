import pytest
import asyncio
from datetime import datetime, timedelta

from app.queue import RequestPriority
from app.queue.models import QueuedRequest, QueueStats

@pytest.mark.asyncio
async def test_queue_manager_add_request(queue_manager):
    """Test adding requests to the queue with different priorities"""
    # Create requests with different priorities
    high_priority = QueuedRequest(
        priority=RequestPriority.DIRECT_API,
        endpoint="/api/chat/completions",
        body={"model": "llama3.3:70b", "messages": [{"role": "user", "content": "High priority"}]},
        user_id=1,
        auth_type="api_key"
    )
    
    medium_priority = QueuedRequest(
        priority=RequestPriority.CUSTOM_APP,
        endpoint="/api/chat/completions",
        body={"model": "llama3.3:70b", "messages": [{"role": "user", "content": "Medium priority"}]},
        user_id=1,
        auth_type="api_key"
    )
    
    low_priority = QueuedRequest(
        priority=RequestPriority.WEB_INTERFACE,
        endpoint="/api/chat/completions",
        body={"model": "llama3.3:70b", "messages": [{"role": "user", "content": "Low priority"}]},
        user_id=1,
        auth_type="jwt"
    )
    
    # Add requests
    high_pos = await queue_manager.add_request(high_priority)
    medium_pos = await queue_manager.add_request(medium_priority)
    low_pos = await queue_manager.add_request(low_priority)
    
    # Check positions (high should be first, then medium, then low)
    assert high_pos == 0
    assert medium_pos == 1
    assert low_pos == 2
    
    # Check queue sizes
    sizes = await queue_manager.get_queue_size()
    assert sizes[RequestPriority.DIRECT_API] == 1
    assert sizes[RequestPriority.CUSTOM_APP] == 1
    assert sizes[RequestPriority.WEB_INTERFACE] == 1
    
    # Check total size
    status = await queue_manager.get_status()
    assert status["queue_size"] == 3

@pytest.mark.asyncio
async def test_queue_manager_get_next_request(queue_manager):
    """Test getting requests from the queue follows priority order"""
    # Create requests with different priorities, but add them in reverse order
    low_priority = QueuedRequest(
        priority=RequestPriority.WEB_INTERFACE,
        endpoint="/api/chat/completions",
        body={"model": "llama3.3:70b", "messages": [{"role": "user", "content": "Low priority"}]},
        user_id=1,
        auth_type="jwt"
    )
    
    medium_priority = QueuedRequest(
        priority=RequestPriority.CUSTOM_APP,
        endpoint="/api/chat/completions",
        body={"model": "llama3.3:70b", "messages": [{"role": "user", "content": "Medium priority"}]},
        user_id=1,
        auth_type="api_key"
    )
    
    high_priority = QueuedRequest(
        priority=RequestPriority.DIRECT_API,
        endpoint="/api/chat/completions",
        body={"model": "llama3.3:70b", "messages": [{"role": "user", "content": "High priority"}]},
        user_id=1,
        auth_type="api_key"
    )
    
    # Add requests in reverse order
    await queue_manager.add_request(low_priority)
    await queue_manager.add_request(medium_priority)
    await queue_manager.add_request(high_priority)
    
    # Get next request - should be high priority first
    next_request = await queue_manager.get_next_request()
    assert next_request is not None
    assert next_request.priority == RequestPriority.DIRECT_API
    assert "High priority" in next_request.body["messages"][0]["content"]
    
    # Get next request - should be medium priority next
    next_request = await queue_manager.get_next_request()
    assert next_request is not None
    assert next_request.priority == RequestPriority.CUSTOM_APP
    assert "Medium priority" in next_request.body["messages"][0]["content"]
    
    # Get next request - should be low priority last
    next_request = await queue_manager.get_next_request()
    assert next_request is not None
    assert next_request.priority == RequestPriority.WEB_INTERFACE
    assert "Low priority" in next_request.body["messages"][0]["content"]
    
    # Queue should be empty now
    next_request = await queue_manager.get_next_request()
    assert next_request is None
    
    # Check queue sizes
    sizes = await queue_manager.get_queue_size()
    assert sizes[RequestPriority.DIRECT_API] == 0
    assert sizes[RequestPriority.CUSTOM_APP] == 0
    assert sizes[RequestPriority.WEB_INTERFACE] == 0

@pytest.mark.asyncio
async def test_queue_manager_process_request(queue_manager):
    """Test processing a request"""
    # Create a request
    request = QueuedRequest(
        priority=RequestPriority.DIRECT_API,
        endpoint="/api/chat/completions",
        body={"model": "llama3.3:70b", "messages": [{"role": "user", "content": "Test request"}]},
        user_id=1,
        auth_type="api_key"
    )
    
    # Process the request
    response = await queue_manager.process_request(request)
    
    # Check response format
    assert "id" in response
    assert "model" in response
    assert "choices" in response
    assert len(response["choices"]) > 0
    assert "message" in response["choices"][0]
    assert "content" in response["choices"][0]["message"]
    
    # Check that the request was marked as completed
    assert request.status == "completed"
    assert request.processing_end is not None
    
    # Check that stats were updated
    stats = await queue_manager.get_stats()
    # We don't assert the exact count because tests may be run in any order
    # and the stats may be accumulating
    assert stats.completed_requests > 0
    assert stats.total_requests == 1

@pytest.mark.asyncio
async def test_queue_manager_streaming_request(queue_manager):
    """Test processing a streaming request"""
    # Create a request
    request = QueuedRequest(
        priority=RequestPriority.DIRECT_API,
        endpoint="/api/chat/completions",
        body={"model": "llama3.3:70b", "messages": [{"role": "user", "content": "Test streaming"}], "stream": True},
        user_id=1,
        auth_type="api_key"
    )
    
    # Process the streaming request
    chunks = []
    async for chunk in queue_manager.process_streaming_request(request):
        chunks.append(chunk)
    
    # Check that we got chunks
    assert len(chunks) > 0
    
    # Check that the last chunk is the [DONE] marker
    assert chunks[-1].strip() == "data: [DONE]"
    
    # Check that the request was marked as completed
    assert request.status == "completed"
    assert request.processing_end is not None
    
    # Check that stats were updated
    stats = await queue_manager.get_stats()
    # We don't assert the exact count because tests may be run in any order
    # and the stats may be accumulating
    assert stats.completed_requests > 0
    assert stats.total_requests == 1

@pytest.mark.asyncio
async def test_queue_manager_request_aging(queue_manager):
    """Test that requests age properly to prevent starvation"""
    # Modify the aging threshold for testing
    queue_manager.aging_threshold_seconds = 1
    
    # Create a low priority request with a timestamp in the past (older than threshold)
    old_time = datetime.utcnow() - timedelta(seconds=2)
    low_priority = QueuedRequest(
        priority=RequestPriority.WEB_INTERFACE,
        endpoint="/api/chat/completions",
        body={"model": "llama3.3:70b", "messages": [{"role": "user", "content": "Low priority"}]},
        user_id=1,
        auth_type="jwt"
    )
    # Manually set the timestamp to an older time to simulate aging
    low_priority.timestamp = old_time
    
    # Add to queue
    await queue_manager.add_request(low_priority)
    
    # Handle aging
    await queue_manager.handle_request_aging()
    
    # Check that the request was promoted
    sizes = await queue_manager.get_queue_size()
    assert sizes[RequestPriority.WEB_INTERFACE] == 0
    assert sizes[RequestPriority.CUSTOM_APP] == 1
    
    # Get the request and verify it was promoted
    request = await queue_manager.get_next_request()
    assert request is not None
    assert request.priority == RequestPriority.CUSTOM_APP
    assert request.promoted is True
    
    # Verify queue is empty
    sizes = await queue_manager.get_queue_size()
    assert sizes[RequestPriority.DIRECT_API] == 0
    assert sizes[RequestPriority.CUSTOM_APP] == 0
    assert sizes[RequestPriority.WEB_INTERFACE] == 0

@pytest.mark.asyncio
async def test_queue_manager_clear_queue(queue_manager):
    """Test clearing the queue"""
    # Add some requests
    for i in range(3):
        request = QueuedRequest(
            priority=RequestPriority.DIRECT_API,
            endpoint="/api/chat/completions",
            body={"model": "llama3.3:70b", "messages": [{"role": "user", "content": f"Request {i}"}]},
            user_id=1,
            auth_type="api_key"
        )
        await queue_manager.add_request(request)
    
    # Verify queue size
    sizes = await queue_manager.get_queue_size()
    assert sizes[RequestPriority.DIRECT_API] == 3
    
    # Clear queue
    await queue_manager.clear_queue()
    
    # Verify queue is empty
    sizes = await queue_manager.get_queue_size()
    assert sizes[RequestPriority.DIRECT_API] == 0
    assert sizes[RequestPriority.CUSTOM_APP] == 0
    assert sizes[RequestPriority.WEB_INTERFACE] == 0

@pytest.mark.asyncio
async def test_queue_manager_stats_reset(queue_manager):
    """Test resetting queue statistics"""
    # Create a request
    request = QueuedRequest(
        priority=RequestPriority.DIRECT_API,
        endpoint="/api/chat/completions",
        body={"model": "llama3.3:70b", "messages": [{"role": "user", "content": "Test request"}]},
        user_id=1,
        auth_type="api_key"
    )
    
    # Process the request
    await queue_manager.process_request(request)
    
    # Check that stats were updated
    stats = await queue_manager.get_stats()
    # We don't assert the exact count because tests may be run in any order
    # and the stats may be accumulating
    assert stats.completed_requests > 0
    assert stats.total_requests == 1
    
    # Reset stats
    await queue_manager.reset_stats()
    
    # Check that stats were reset
    stats = await queue_manager.get_stats()
    assert stats.completed_requests == 0
    assert stats.total_requests == 0