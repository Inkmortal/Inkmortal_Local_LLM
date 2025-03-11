"""
WebSocket connection management for real-time chat functionality.
"""
from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from typing import Dict, List, Optional, Any, Literal
import logging
import json
import time

from ...auth.models import User

# Set up logger
logger = logging.getLogger("app.api.chat.websocket")

# Content update modes
APPEND = "APPEND"
REPLACE = "REPLACE"

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        # Maps user_id to a list of websocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Maps request_id to user_id for tracking status updates
        self.request_tracking: Dict[str, int] = {}
        # Connection timestamps for monitoring
        self.connection_times: Dict[WebSocket, float] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        """Add a new websocket connection for a user"""
        await websocket.accept()
        
        # Initialize user connections list if needed
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
            
        # Add this connection to the user's list
        self.active_connections[user_id].append(websocket)
        self.connection_times[websocket] = time.time()
        
        logger.info(f"WebSocket connection established for user {user_id}, now has {len(self.active_connections[user_id])} connections")
    
    def disconnect(self, websocket: WebSocket, user_id: int):
        """Remove a websocket connection for a user"""
        if user_id in self.active_connections:
            # Remove this specific connection
            self.active_connections[user_id] = [
                conn for conn in self.active_connections[user_id] 
                if conn is not websocket
            ]
            
            # Clean up connection time
            if websocket in self.connection_times:
                duration = time.time() - self.connection_times[websocket]
                del self.connection_times[websocket]
                logger.info(f"WebSocket connection closed for user {user_id} after {duration:.2f} seconds")
            
            # Clean up if no connections left for this user
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                logger.info(f"User {user_id} has no active WebSocket connections left")
    
    async def send_update(
        self, 
        user_id: int, 
        data: dict,
        content_update_type: str = APPEND
    ):
        """Send a message to all websockets for a specific user"""
        if user_id not in self.active_connections:
            logger.warning(f"No active connections for user {user_id}")
            return
            
        # Get all active connections for this user
        connections = self.active_connections[user_id]
        if not connections:
            logger.warning(f"Empty connections list for user {user_id}")
            return
        
        # Ensure content_update_type is set if we have assistant_content
        if "assistant_content" in data and "content_update_type" not in data:
            data["content_update_type"] = content_update_type
        
        # Log what we're sending for debugging
        update_type = data.get("type")
        message_id = data.get("message_id", "unknown")
        conversation_id = data.get("conversation_id", "unknown")
        status = data.get("status", "unknown")
        is_complete = data.get("is_complete", False)
        
        # Track the number of tokens in each update
        if "assistant_content" in data:
            token_len = len(data.get("assistant_content", ""))
            logger.info(
                f"WebSocket update: user={user_id}, type={update_type}, "
                f"msg={message_id}, conv={conversation_id}, status={status}, "
                f"update_type={content_update_type}, complete={is_complete}, tokens={token_len}"
            )
            
        # Send the message to all connections
        success_count = 0
        for connection in connections:
            try:
                if connection.client_state == WebSocketState.CONNECTED:
                    await connection.send_json(data)
                    success_count += 1
                else:
                    logger.warning(f"Skipping disconnected WebSocket for user {user_id}")
            except Exception as e:
                logger.error(f"Error sending WebSocket update: {str(e)}")
        
        if "assistant_content" in data:
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
    
    async def send_section_update(
        self,
        user_id: int,
        message_id: str,
        conversation_id: str,
        section: str,
        content: str,
        is_complete: bool = False,
        operation: str = APPEND
    ):
        """Send a section-specific update with improved structure"""
        await self.send_update(
            user_id=user_id,
            data={
                "type": "message_update",
                "message_id": message_id,
                "conversation_id": conversation_id,
                "status": "STREAMING",
                "section": section,
                "assistant_content": content,
                "content_update_type": operation,
                "is_complete": is_complete
            },
            content_update_type=operation
        )

# Initialize the connection manager - singleton pattern
manager = ConnectionManager()