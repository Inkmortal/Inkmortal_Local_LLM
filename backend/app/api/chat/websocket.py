"""
WebSocket connection management for real-time chat functionality.
"""
from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from typing import Dict, List, Optional, Any, Literal
import logging
import json
import time
import asyncio

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
        # Client readiness tracking - message ID to timestamp of readiness signal
        self.client_ready_state: Dict[str, float] = {}
        # Lock for synchronized access to the client_ready_state
        self._ready_lock = asyncio.Lock()
    
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
        # Basic check if we have connections for this user
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
        
        # Log only key info for important updates
        if data.get("status") in ["COMPLETE", "ERROR"] or data.get("is_complete", False):
            # Log completion or error events more prominently
            message_id = data.get("message_id", "unknown")
            status = data.get("status", "unknown")
            logger.info(f"WebSocket status update: user={user_id}, msg={message_id}, status={status}")
            
        # Send the message to all connections
        success_count = 0
        disconnected = []
        
        # Make a copy of connections to avoid modifying while iterating
        for connection in list(connections):
            try:
                if connection.client_state == WebSocketState.CONNECTED:
                    await connection.send_json(data)
                    success_count += 1
                else:
                    # Clean up disconnected connections
                    logger.warning(f"Found disconnected WebSocket for user {user_id}")
                    disconnected.append(connection)
            except Exception as e:
                logger.error(f"Error sending WebSocket update: {str(e)}")
                # Only log traceback for serious errors
                if "is_complete" in data and data["is_complete"]:
                    import traceback
                    logger.error(f"WebSocket send error details:\n{traceback.format_exc()}")
                # Add to disconnected list if there was an error sending
                disconnected.append(connection)
        
        # Clean up any disconnected connections we found
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
                    del self.connection_times[connection]
                    
        # Only log on errors or completion status
        if data.get("status") in ["ERROR", "COMPLETE"] and success_count < len(connections):
            logger.warning(f"Important WebSocket update reached only {success_count}/{len(connections)} connections for user {user_id}")
    
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
    
    async def mark_client_ready(self, message_id: str, conversation_id: str, user_id: int):
        """Mark a client as ready to receive updates for a specific message"""
        if not message_id or not conversation_id:
            logger.warning(f"Cannot mark client ready - missing IDs: message_id={message_id}, conversation_id={conversation_id}")
            return False
        
        # Use composite key of message_id + conversation_id to ensure uniqueness
        ready_key = f"{message_id}:{conversation_id}:{user_id}"
        
        async with self._ready_lock:
            self.client_ready_state[ready_key] = time.time()
            logger.info(f"Client marked ready for updates: {ready_key}")
        return True
    
    async def wait_for_client_ready(self, message_id: str, conversation_id: str, user_id: int, timeout: float = 5.0):
        """Wait for client to signal readiness before sending updates"""
        if not message_id or not conversation_id:
            logger.warning(f"Cannot wait for client readiness - missing IDs")
            return False
            
        ready_key = f"{message_id}:{conversation_id}:{user_id}"
        start_time = time.time()
        
        # Check if client is already ready
        async with self._ready_lock:
            if ready_key in self.client_ready_state:
                logger.info(f"Client already ready for: {ready_key}")
                return True
        
        # Wait for readiness signal
        while time.time() - start_time < timeout:
            async with self._ready_lock:
                if ready_key in self.client_ready_state:
                    logger.info(f"Client became ready for: {ready_key}")
                    return True
            # Sleep shortly to avoid tight loop
            await asyncio.sleep(0.1)
        
        logger.warning(f"Timeout waiting for client readiness: {ready_key}")
        return False
        
    async def clear_client_ready(self, message_id: str, conversation_id: str, user_id: int):
        """Clear client readiness state after processing is complete"""
        ready_key = f"{message_id}:{conversation_id}:{user_id}"
        
        async with self._ready_lock:
            if ready_key in self.client_ready_state:
                del self.client_ready_state[ready_key]
                logger.info(f"Cleared client readiness state: {ready_key}")
    
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
        # Create our update data
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
        
        # Validate message ID is not empty
        if not message_id or message_id == "unknown" or message_id == "undefined":
            # Use conversation ID + timestamp as fallback
            fallback_id = f"{conversation_id}_{int(time.time())}"
            logger.warning(f"Invalid message ID, using fallback: {fallback_id}")
            update_data["message_id"] = fallback_id
        
        await self.send_update(
            user_id=user_id,
            data=update_data,
            content_update_type=operation
        )

# Initialize the connection manager - singleton pattern
manager = ConnectionManager()