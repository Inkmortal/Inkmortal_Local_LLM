"""
Main application entry point.
"""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import logging
import asyncio
import os
from dotenv import load_dotenv

# Import local modules
from .auth.router import router as auth_router, generate_setup_token, check_admin_exists
from .auth.activities import router as activities_router
from .auth.utils import get_current_user, get_current_admin_user
from .auth.models import User
from .api.gateway import router as api_router
from .admin.router import router as admin_router
from .db import engine, Base, get_db
from .queue import get_queue_manager
from .config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("app.main")

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="Seadragon LLM API",
    description="API for the Seadragon LLM Server - A personal LLM hosting system",
    version="0.1.0",
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load environment variables
load_dotenv()

# Get the queue manager instance
queue_manager = get_queue_manager()

@app.on_event("startup")
async def startup_event():
    """Connect to services on startup"""
    if not settings.is_testing:
        # Connect to RabbitMQ with retry logic
        max_retries = 5
        retry_count = 0
        connected = False
        
        while not connected and retry_count < max_retries:
            try:
                await queue_manager.connect()
                connected = True
                logger.info("Successfully connected to message queue")
            except Exception as e:
                retry_count += 1
                wait_time = retry_count * 2  # Exponential backoff
                logger.warning(f"Failed to connect to message queue (attempt {retry_count}/{max_retries}): {str(e)}")
                logger.warning(f"Retrying in {wait_time} seconds...")
                await asyncio.sleep(wait_time)
        
        if not connected:
            logger.error(f"Failed to connect to message queue after {max_retries} attempts")
            # Don't crash the app, but log the error
    
    # Generate admin setup token if needed
    from contextlib import asynccontextmanager
    
    @asynccontextmanager
    async def get_db_context():
        db = next(get_db())
        try:
            yield db
        finally:
            db.close()
    
    async with get_db_context() as db:
        admin_exists = await check_admin_exists(db)
        if not admin_exists:
            logger.warning("No admin user found. Generating admin setup token...")
            token = await generate_setup_token(db)
            if token:
                logger.warning(f"[ADMIN SETUP] Initial admin setup token: {token}")
                logger.warning("Use this token to create the first admin account through the admin setup page.")
                logger.warning("This token will expire in 24 hours.")
            else:
                logger.error("Failed to generate admin setup token.")

@app.on_event("shutdown")
async def shutdown_event():
    """Close connections on shutdown"""
    if not settings.is_testing:
        try:
            await queue_manager.close()
            logger.info("Queue manager connection closed")
        except Exception as e:
            logger.error(f"Error closing queue manager connection: {str(e)}")


# Include routers
app.include_router(auth_router)
app.include_router(activities_router)
app.include_router(api_router)
app.include_router(admin_router)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Seadragon LLM Server",
        "docs": "/docs",
        "version": "0.1.0",
        "environment": settings.environment.name
    }

# Health check endpoint - simpler and more reliable than the one previously added in Login.tsx
@app.get("/health")
async def health_check():
    """Simple health check endpoint to verify server is responding"""
    return {
        "status": "healthy",
        "message": "Server is running",
        "version": "0.1.0"
    }

# Protected endpoint example
@app.get("/protected")
async def protected_route(current_user: User = Depends(get_current_user)):
    return {
        "message": f"Hello, {current_user.username}!",
        "user_id": current_user.id
    }

# Admin-only endpoint example
@app.get("/admin")
async def admin_route(current_user: User = Depends(get_current_admin_user)):
    return {
        "message": f"Hello, Admin {current_user.username}!",
        "admin_id": current_user.id
    }