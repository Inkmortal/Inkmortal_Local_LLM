"""
Constants used across the application.
"""

# Content update modes for WebSocket messages
class ContentUpdateMode:
    APPEND = "APPEND"   # Append content to existing content
    REPLACE = "REPLACE" # Replace existing content completely
    
# WebSocket operation constants
APPEND = "APPEND"
REPLACE = "REPLACE" 