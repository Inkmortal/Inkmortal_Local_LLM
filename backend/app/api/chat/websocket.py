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
            logger.warning(f"No active connections for user {user_id}")
            return
            
        # Get all active connections for this user
        connections = self.active_connections[user_id]
        if not connections:
            logger.warning(f"Empty connections list for user {user_id}")
            return
        
        # Log what we're sending for debugging
        update_type = data.get("type")
        msg_id = data.get("message_id", "unknown")
        update_mode = data.get("content_update_type", "unspecified")
        is_complete = data.get("is_complete", False)
        
        # Track the number of tokens in each update
        token_len = 0
        if "assistant_content" in data:
            token_len = len(data["assistant_content"])
            
        logger.info(f"WebSocket update: user={user_id}, type={update_type}, msg={msg_id}, mode={update_mode}, complete={is_complete}, tokens={token_len}")
            
        # Send the message to all connections
        success_count = 0
        for connection in connections:
            try:
                if connection.client_state != WebSocketState.DISCONNECTED:
                    await connection.send_json(data)
                    success_count += 1
                else:
                    logger.warning(f"Skipping disconnected WebSocket for user {user_id}")
            except Exception as e:
                logger.error(f"Error sending WebSocket update: {str(e)}")
                
        logger.info(f"WebSocket update sent to {success_count}/{len(connections)} connections for user {user_id}")
    
    def track_request(self, request_id: str, user_id: int):
        """Associate a request with a user for status updates"""
        self.request_tracking[request_id] = user_id
        logger.info(f"Tracking request {request_id} for user {user_id}")
    
    def get_user_for_request(self, request_id: str) -> Optional[int]:
        """Get the user_id associated with a request"""
        return self.request_tracking.get(request_id)
    
    def untrack_request(self, request_id: str):
        """Remove a request from tracking when complete"""
        if request_id in self.request_tracking:
            user_id = self.request_tracking[request_id]
            del self.request_tracking[request_id]
            logger.info(f"Untracked request {request_id} for user {user_id}")

# Initialize the connection manager - singleton pattern
manager = ConnectionManager()