import pytest
from fastapi import status
from app.queue import RequestPriority

def test_api_gateway_auth_required(client):
    """Test that API gateway endpoints require authentication"""
    response = client.post(
        "/api/chat/completions",
        json={
            "model": "llama3.3:70b",
            "messages": [{"role": "user", "content": "Hello"}]
        }
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_api_gateway_with_api_key(client, test_api_key):
    """Test API gateway access with API key"""
    response = client.post(
        "/api/chat/completions",
        json={
            "model": "llama3.3:70b",
            "messages": [{"role": "user", "content": "Hello"}]
        },
        headers={"X-API-Key": test_api_key.key}
    )
    
    assert response.status_code == status.HTTP_200_OK

@pytest.mark.asyncio
async def test_api_gateway_with_jwt(client, auth_headers):
    """Test API gateway access with JWT token"""
    response = client.post(
        "/api/chat/completions",
        json={
            "model": "llama3.3:70b",
            "messages": [{"role": "user", "content": "Hello"}]
        },
        headers=auth_headers
    )
    
    assert response.status_code == status.HTTP_200_OK

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