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
        # CRITICAL DEBUG: Log full data being sent to WebSocket
        logger.info(f"WEBSOCKET DEBUG: Preparing to send update to user {user_id}")
        logger.info(f"WEBSOCKET DEBUG: Data type: {data.get('type')}")
        logger.info(f"WEBSOCKET DEBUG: Message ID: {data.get('message_id')}")
        
        if "assistant_content" in data:
            content = data.get("assistant_content", "")
            logger.info(f"WEBSOCKET DEBUG: Content length: {len(content)}, preview: {content[:50]}")
        
        if user_id not in self.active_connections:
            logger.warning(f"No active connections for user {user_id}")
            return
            
        # Get all active connections for this user
        connections = self.active_connections[user_id]
        if not connections:
            logger.warning(f"Empty connections list for user {user_id}")
            return
        
        # CRITICAL FIX: Validate and ensure proper message ID
        message_id = data.get("message_id")
        if not message_id or message_id == "unknown" or message_id == "undefined":
            logger.error(f"INVALID MESSAGE ID in update: {message_id}")
            # Use conversation ID + timestamp as fallback if provided
            conversation_id = data.get("conversation_id")
            if conversation_id:
                fallback_id = f"{conversation_id}_{int(time.time())}"
                logger.warning(f"Using fallback ID: {fallback_id}")
                data["message_id"] = fallback_id
            else:
                # Last resort fallback
                data["message_id"] = f"fallback_{int(time.time())}"
                logger.warning(f"Using last resort fallback ID: {data['message_id']}")
        
        # Ensure content_update_type is set if we have assistant_content
        if "assistant_content" in data and "content_update_type" not in data:
            data["content_update_type"] = content_update_type
        
        # Log what we're sending for debugging
        update_type = data.get("type")
        message_id = data.get("message_id", "unknown") # Updated with fallback if needed
        conversation_id = data.get("conversation_id", "unknown")
        status = data.get("status", "unknown")
        is_complete = data.get("is_complete", False)
        
        # Track the number of tokens in each update
        if "assistant_content" in data:
            token_len = len(data.get("assistant_content", ""))
            # Enhanced logging to include first few characters of token for tracing
            token_preview = ""
            if token_len > 0:
                token_preview = data.get("assistant_content", "")[:10]
                if token_len > 10:
                    token_preview += "..."
                token_preview = f", token_preview=\"{token_preview}\""
            
            logger.info(
                f"WebSocket update: user={user_id}, type={update_type}, "
                f"msg={message_id}, conv={conversation_id}, status={status}, "
                f"update_type={content_update_type}, complete={is_complete}, tokens={token_len}{token_preview}"
            )
            
        # Send the message to all connections
        success_count = 0
        disconnected = []
        
        # CRITICAL FIX: Make a copy of connections to avoid modifying while iterating
        for connection in list(connections):
            try:
                if connection.client_state == WebSocketState.CONNECTED:
                    # Add diagnostic for each send
                    logger.info(f"WEBSOCKET SEND: Sending data to client for user {user_id}, msg_id={data.get('message_id')}")
                    await connection.send_json(data)
                    logger.info(f"WEBSOCKET SEND: Successfully sent update")
                    success_count += 1
                else:
                    logger.warning(f"Found disconnected WebSocket for user {user_id}, state={connection.client_state}")
                    disconnected.append(connection)
            except Exception as e:
                logger.error(f"Error sending WebSocket update: {str(e)}")
                # Add more detail for debugging
                import traceback
                logger.error(f"WebSocket send error details:\n{traceback.format_exc()}")
                # Add to disconnected list if there was an error sending
                disconnected.append(connection)
        
        # CRITICAL FIX: Clean up any disconnected connections we found
        if disconnected:
            logger.info(f"Cleaning up {len(disconnected)} disconnected WebSockets for user {user_id}")
            for connection in disconnected:
                # Remove from active_connections list
                if user_id in self.active_connections:
                    self.active_connections[user_id] = [
                        conn for conn in self.active_connections[user_id] 
                        if conn is not connection
                    ]
                # Clean up connection time
                if connection in self.connection_times:
                    duration = time.time() - self.connection_times[connection]
                    del self.connection_times[connection]
                    logger.info(f"Removed stale WebSocket connection for user {user_id} after {duration:.2f} seconds")
        
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
        # Log the message ID to verify it's correct
        logger.debug(f"Sending section update with message_id: {message_id}")
        
        # Create and validate our update data
        update_data = {
            "type": "message_update",
            "message_id": message_id,
            "conversation_id": conversation_id,
            "status": "STREAMING",
            "section": section,
            "assistant_content": content,
            "content_update_type": operation,
            "is_complete": is_complete
        }
        
        # CRITICAL: Validate message ID is not empty
        if not message_id or message_id == "unknown" or message_id == "undefined":
            logger.error(f"INVALID MESSAGE ID in section update: {message_id}")
            # Try to use conversation ID + timestamp as fallback
            fallback_id = f"{conversation_id}_{int(time.time())}"
            logger.warning(f"Using fallback ID: {fallback_id}")
            update_data["message_id"] = fallback_id
        
        await self.send_update(
            user_id=user_id,
            data=update_data,
            content_update_type=operation
        )

# Initialize the connection manager - singleton pattern
manager = ConnectionManager()