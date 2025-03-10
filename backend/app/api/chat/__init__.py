"""
Chat API module for conversations and message management.
"""
from fastapi import APIRouter

from .router import router

# Export the router for including in the main application
__all__ = ["router"]