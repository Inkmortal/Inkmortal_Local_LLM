"""
WebSocket connection management for real-time chat functionality.
"""
from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from typing import Dict, List, Optional, Any
import logging
import json

from ...auth.models import User

# Set up logger
logger = logging.getLogger("app.api.chat.websocket")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        # Maps user_id to a list of websocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Maps request_id to user_id for tracking status updates
        self.request_tracking: Dict[str, int] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        """Add a new websocket connection for a user"""
        await websocket.accept()
        
        # Initialize user connections list if needed
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
            
        # Add this connection to the user's list
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connection established for user {user_id}")
    
    def disconnect(self, websocket: WebSocket, user_id: int):
        """Remove a websocket connection for a user"""
        if user_id in self.active_connections:
            # Remove this specific connection
            self.active_connections[user_id] = [
                conn for conn in self.active_connections[user_id] 
                if conn is not websocket
            ]
            
            # Clean up if no connections left for this user
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                
            logger.info(f"WebSocket connection closed for user {user_id}")
    
    async def send_update(self, user_id: int, data: dict):
        """Send a message to all websockets for a specific user"""
        if user_id not in self.active_connections:
            return
            
        # Get all active connections for this user
        connections = self.active_connections[user_id]
        if not connections:
            return
            
        # Send the message to all connections
        for connection in connections:
            try:
                if connection.client_state != WebSocketState.DISCONNECTED:
                    await connection.send_json(data)
            except Exception as e:
                logger.error(f"Error sending WebSocket update: {str(e)}")
    
    def track_request(self, request_id: str, user_id: int):
        """Associate a request with a user for status updates"""
        self.request_tracking[request_id] = user_id
    
    def get_user_for_request(self, request_id: str) -> Optional[int]:
        """Get the user_id associated with a request"""
        return self.request_tracking.get(request_id)
    
    def untrack_request(self, request_id: str):
        """Remove a request from tracking when complete"""
        if request_id in self.request_tracking:
            del self.request_tracking[request_id]

# Initialize the connection manager - singleton pattern
manager = ConnectionManager()