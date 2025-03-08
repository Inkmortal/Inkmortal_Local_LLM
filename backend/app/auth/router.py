"""
Main authentication router - imports and combines all sub-routers
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# Import all sub-routers
from .login.router import router as login_router, check_admin_exists, generate_setup_token
from .users.router import router as users_router
from .tokens.router import router as tokens_router
from .api_keys.router import router as api_keys_router
from .queue_integration.router import router as queue_router

# Create parent router
router = APIRouter(prefix="/auth", tags=["authentication"])

# Include all sub-routers
router.include_router(login_router, prefix="")
router.include_router(users_router, prefix="")
router.include_router(tokens_router, prefix="")
router.include_router(api_keys_router, prefix="")
router.include_router(queue_router, prefix="")

# Export necessary functions for startup
__all__ = ["router"]