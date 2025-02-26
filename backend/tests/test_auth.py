import pytest
from fastapi import status
from app.auth.models import User, RegistrationToken, APIKey

def test_register_user(client, test_registration_token, db_session):
    """Test user registration with a valid token"""
    response = client.post(
        "/auth/register",
        json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "newpassword",
            "token": test_registration_token.token
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["message"] == "User registered successfully"
    
    # Check database
    user = db_session.query(User).filter(User.username == "newuser").first()
    assert user is not None
    assert user.email == "new@example.com"
    assert not user.is_admin
    
    # Check token is marked as used
    token = db_session.query(RegistrationToken).filter(
        RegistrationToken.token == test_registration_token.token
    ).first()
    assert token.used
    assert token.used_by == user.id

def test_register_invalid_token(client):
    """Test registration with invalid token"""
    response = client.post(
        "/auth/register",
        json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "newpassword",
            "token": "invalid-token"
        }
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid" in response.json()["detail"]

def test_register_duplicate_username(client, test_registration_token, test_user):
    """Test registration with existing username"""
    response = client.post(
        "/auth/register",
        json={
            "username": test_user.username,
            "email": "another@example.com",
            "password": "newpassword",
            "token": test_registration_token.token
        }
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already registered" in response.json()["detail"]

def test_login_success(client, test_user):
    """Test successful login"""
    response = client.post(
        "/auth/token",
        data={
            "username": test_user.username,
            "password": "testpassword"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["username"] == test_user.username

def test_login_invalid_credentials(client):
    """Test login with invalid credentials"""
    response = client.post(
        "/auth/token",
        data={
            "username": "nonexistent",
            "password": "wrong"
        }
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_get_current_user(client, auth_headers, test_user):
    """Test getting current user info"""
    response = client.get("/auth/users/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["username"] == test_user.username
    assert data["email"] == test_user.email

def test_create_registration_token(client, admin_headers):
    """Test creating registration token (admin only)"""
    response = client.post(
        "/auth/tokens",
        json={
            "description": "New token",
            "expires_days": 7
        },
        headers=admin_headers
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert "token" in data
    assert data["description"] == "New token"
    assert data["expires_at"] is not None

def test_create_token_non_admin(client, auth_headers):
    """Test creating token with non-admin user"""
    response = client.post(
        "/auth/tokens",
        json={"description": "New token"},
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_list_registration_tokens(client, admin_headers, test_registration_token):
    """Test listing registration tokens (admin only)"""
    response = client.get("/auth/tokens", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert data[0]["token"] == test_registration_token.token

def test_create_api_key(client, admin_headers):
    """Test creating API key (admin only)"""
    response = client.post(
        "/auth/apikeys",
        json={
            "description": "Test API key",
            "priority": 2
        },
        headers=admin_headers
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert "key" in data
    assert data["description"] == "Test API key"
    assert data["priority"] == 2

def test_list_api_keys(client, admin_headers, test_api_key):
    """Test listing API keys (admin only)"""
    response = client.get("/auth/apikeys", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # Only partial key should be visible
    assert "..." in data[0]["key"]

def test_delete_api_key(client, admin_headers, test_api_key, db_session):
    """Test deleting API key (admin only)"""
    response = client.delete(
        f"/auth/apikeys/{test_api_key.id}",
        headers=admin_headers
    )
    assert response.status_code == status.HTTP_200_OK
    
    # Verify key is deleted
    key = db_session.query(APIKey).filter(APIKey.id == test_api_key.id).first()
    assert key is None

def test_delete_nonexistent_api_key(client, admin_headers):
    """Test deleting non-existent API key"""
    response = client.delete(
        "/auth/apikeys/999",
        headers=admin_headers
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND