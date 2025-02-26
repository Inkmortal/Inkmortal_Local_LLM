from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import logging
import asyncio
import os
from dotenv import load_dotenv

# Import local modules
from .auth.router import router as auth_router
from .auth.utils import get_current_user, get_current_admin_user
from .auth.models import User
from .api.gateway import router as api_router
from .db import engine, Base, get_db
from .queue.rabbitmq.manager import get_queue_manager

# Configure logging
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
    allow_origins=[
        "https://chat.seadragoninkmortal.com",
        "https://admin.seadragoninkmortal.com",
        "http://localhost:3000"  # For local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load environment variables
load_dotenv()

# Ensure required environment variables
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434")
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost/")

# Get the queue manager instance
queue_manager = get_queue_manager()

@app.on_event("startup")
async def startup_event():
    """Connect to RabbitMQ on startup"""
    # Connect with retry logic
    max_retries = 5
    retry_count = 0
    connected = False
    
    while not connected and retry_count < max_retries:
        try:
            await queue_manager.connect()
            connected = True
            logger.info("Successfully connected to RabbitMQ")
        except Exception as e:
            retry_count += 1
            wait_time = retry_count * 2  # Exponential backoff
            logger.warning(f"Failed to connect to RabbitMQ (attempt {retry_count}/{max_retries}): {str(e)}")
            logger.warning(f"Retrying in {wait_time} seconds...")
            await asyncio.sleep(wait_time)
    
    if not connected:
        logger.error(f"Failed to connect to RabbitMQ after {max_retries} attempts")
        # Don't crash the app, but log the error

@app.on_event("shutdown")
async def shutdown_event():
    """Close RabbitMQ connection on shutdown"""
    try:
        await queue_manager.close()
        logger.info("RabbitMQ connection closed")
    except Exception as e:
        logger.error(f"Error closing RabbitMQ connection: {str(e)}")


# Include routers
app.include_router(auth_router)
app.include_router(api_router)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Seadragon LLM Server",
        "docs": "/docs",
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

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}