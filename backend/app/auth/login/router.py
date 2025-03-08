"""
Authentication endpoints for login and registration
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import secrets
import string
import logging

from ..models import User, RegistrationToken, SetupToken
from ..utils import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user,
    get_current_admin_user
)
from ..activities import log_activity
from ...db import get_db

# Configure logging
logger = logging.getLogger("app.auth.login")

# Create router
router = APIRouter(prefix="/auth", tags=["authentication"])

# Admin setup functions
async def check_admin_exists(db: Session) -> bool:
    """Check if any admin user exists in the system"""
    return db.query(User).filter(User.is_admin == True).first() is not None

async def generate_setup_token(db: Session) -> str:
    """Generate a setup token for initial admin creation if no admin exists"""
    # Check if admin exists
    admin_exists = await check_admin_exists(db)
    if admin_exists:
        return None
    
    # Check if valid setup token already exists
    existing_token = db.query(SetupToken).filter(
        SetupToken.is_valid == True,
        SetupToken.expires_at > datetime.utcnow()
    ).first()
    
    if existing_token:
        return existing_token.token
    
    # Generate new token
    token_chars = string.ascii_letters + string.digits
    token = 'ADMIN-' + '-'.join(''.join(secrets.choice(token_chars) for _ in range(4)) for _ in range(4))
    
    # Create token with 24-hour expiration
    expires_at = datetime.utcnow() + timedelta(hours=24)
    setup_token = SetupToken(
        token=token,
        expires_at=expires_at,
        is_valid=True
    )
    
    # Save to database
    db.add(setup_token)
    db.commit()
    
    # Log the token
    logger.warning(f"[ADMIN SETUP] Initial admin setup token: {token}")
    
    return token

# Check admin setup status
@router.get("/admin/setup-status")
async def check_admin_setup_status(db: Session = Depends(get_db)):
    """Check if admin setup is required"""
    admin_exists = await check_admin_exists(db)
    return {"admin_exists": admin_exists}

# Fetch setup token endpoint
@router.get("/admin/fetch-setup-token")
async def fetch_setup_token(db: Session = Depends(get_db)):
    """Fetch the current admin setup token if no admin exists yet"""
    
    # Check if admin already exists
    admin_exists = await check_admin_exists(db)
    if admin_exists:
        return {"token": None, "message": "Admin account already exists"}
    
    # Look for existing valid token
    existing_token = db.query(SetupToken).filter(
        SetupToken.is_valid == True,
        SetupToken.expires_at > datetime.utcnow()
    ).first()
    
    if existing_token:
        return {"token": existing_token.token, "expires_at": existing_token.expires_at}
    
    # Generate a new token
    token = await generate_setup_token(db)
    if token:
        return {"token": token, "message": "New setup token generated"}
    
    return {"token": None, "message": "Failed to generate setup token"}

# Admin setup endpoint
@router.post("/admin/setup", status_code=status.HTTP_201_CREATED)
async def setup_admin(
    username: str = Body(...),
    email: str = Body(...),
    password: str = Body(...),
    token: str = Body(...),
    db: Session = Depends(get_db)
):
    """Set up the initial admin account using a setup token"""
    
    # Check if admin already exists
    admin_exists = await check_admin_exists(db)
    if admin_exists:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account already exists"
        )
    
    # Validate setup token
    setup_token = db.query(SetupToken).filter(
        SetupToken.token == token,
        SetupToken.is_valid == True,
        SetupToken.expires_at > datetime.utcnow()
    ).first()
    
    if not setup_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired setup token"
        )
    
    # Create admin user
    admin_user = User(
        username=username,
        email=email,
        password_hash=get_password_hash(password),
        is_admin=True,
        is_active=True
    )
    
    # Save admin user
    db.add(admin_user)
    
    # Invalidate setup token
    setup_token.is_valid = False
    setup_token.used_at = datetime.utcnow()
    
    db.commit()
    db.refresh(admin_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": admin_user.username},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": admin_user.username,
        "is_admin": admin_user.is_admin
    }

# Admin login
@router.post("/admin/login")
async def login_admin(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Authenticate admin user and provide a JWT token"""
    
    # Get user by username
    user = db.query(User).filter(User.username == form_data.username).first()
    
    # Verify user exists and password is correct
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active and admin
    if not user.is_active or not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not an active admin",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(days=14)  # Same 14-day expiry for admins
    access_token = create_access_token(
        data={"sub": user.username, "admin": True},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "is_admin": user.is_admin
    }

# User registration
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    username: str = Body(...),
    email: str = Body(...),
    password: str = Body(...),
    token: str = Body(...),
    db: Session = Depends(get_db)
):
    """Register a new user with a valid registration token"""
    
    # Validate registration token
    db_token = db.query(RegistrationToken).filter(
        RegistrationToken.token == token,
        RegistrationToken.used == False,
        (RegistrationToken.expires_at.is_(None) | (RegistrationToken.expires_at > datetime.utcnow()))
    ).first()
    
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid or expired registration token"
        )
    
    # Check if username already exists
    existing_username = db.query(User).filter(User.username == username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Username already registered"
        )
    
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Email already registered"
        )
    
    # Create new user
    user = User(
        username=username,
        email=email,
        password_hash=get_password_hash(password),
        registration_token=token,
        is_admin=False  # Default to non-admin
    )
    
    # Add user to database
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Mark token as used and link to user
    db_token.used = True
    db_token.used_by = user.id
    db.commit()
    
    return {"message": "User registered successfully"}

# Login endpoint
@router.post("/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Authenticate user and provide a JWT token"""
    
    # Get user by username
    user = db.query(User).filter(User.username == form_data.username).first()
    
    # Verify user exists and password is correct
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(days=14)  # Set to 14 days for long-lasting sessions
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "is_admin": user.is_admin
    }