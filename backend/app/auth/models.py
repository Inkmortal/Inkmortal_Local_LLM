from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..db import Base

class User(Base):
    """User model for authentication and authorization"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    registration_token = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationship with APIKey model if needed
    # api_keys = relationship("APIKey", back_populates="user")

class RegistrationToken(Base):
    """Registration token model for invitation-based registration"""
    __tablename__ = "registration_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)  # Optional description of token purpose
    created_by = Column(Integer, nullable=True)  # Admin who created the token
    used = Column(Boolean, default=False)
    used_by = Column(Integer, nullable=True)  # User who used this token
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)  # Optional expiration date

class APIKey(Base):
    """API Key model for custom applications"""
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    priority = Column(Integer, default=2)  # Default to priority level 2
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    last_used = Column(DateTime, nullable=True)
    
    # Relationship with User model if needed
    # user = relationship("User", back_populates="api_keys")

class SetupToken(Base):
    """Setup token model for initial admin account creation"""
    __tablename__ = "setup_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime)
    is_valid = Column(Boolean, default=True)
    used_at = Column(DateTime, nullable=True)

class ActivityLog(Base):
    """Activity log for tracking admin actions"""
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)  # User who performed the action
    action = Column(String, index=True)    # Action (created, deleted, added, etc.)
    resource_type = Column(String, index=True)  # Type of resource (api-key, ip, token, etc.)
    resource_name = Column(String)  # Name or identifier of the resource
    timestamp = Column(DateTime, server_default=func.now())