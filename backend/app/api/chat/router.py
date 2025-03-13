"""
Main router for chat API endpoints.

This file imports and re-exports the router from router_endpoints.py.
The separation of files keeps each module under 400 lines
while maintaining logical organization.
"""
# Re-export the router from the endpoints file
from .router_endpoints import router

# This file is intentionally minimal to maintain modularity.
# The actual implementation is split across:
# - router_endpoints.py - API endpoint definitions
# - stream_message.py - Streaming message implementation
# - conversation_service.py - Conversation CRUD operations
# - websocket.py - WebSocket connection management