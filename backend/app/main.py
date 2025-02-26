from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Import local modules
from .auth.router import router as auth_router
from .auth.utils import get_current_user, get_current_admin_user
from .auth.models import User
from .api.gateway import router as api_router
from .db import engine, Base, get_db

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

# Note on dependencies
"""
Required packages for this implementation:
- fastapi
- uvicorn
- sqlalchemy
- psycopg2-binary
- passlib[bcrypt]
- python-jose[cryptography]
- python-multipart
- python-dotenv
- httpx

Install using:
pip install fastapi uvicorn sqlalchemy psycopg2-binary passlib[bcrypt] python-jose[cryptography] python-multipart python-dotenv httpx
"""

# Run the application with:
# uvicorn app.main:app --reload