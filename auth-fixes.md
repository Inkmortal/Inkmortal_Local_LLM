# Auth Fixes and Improvements

1. **Update Token Expiration:**
   - The token expiration in `frontend/src/context/AuthContext.tsx` has been changed to 14 days:
     ```typescript
     // Create expiration time (14 days from now)
     const expiresAt = new Date();
     expiresAt.setDate(expiresAt.getDate() + 14);
     ```
   
   - Cookie expiration is now set to 1209600 seconds (14 days):
     ```typescript
     document.cookie = `auth_session=${encodeURIComponent(username)}; path=/; max-age=1209600; SameSite=Lax; secure`;
     ```

2. **Fix Login Endpoint in Frontend:**
   - Changed from `/auth/login` to `/auth/token` for regular user login

3. **Update Backend Token Expiration:**
   - Changed token expiration from 30 minutes to 14 days for both regular and admin users:
     ```python
     access_token_expires = timedelta(days=14)  # Set to 14 days for long-lasting sessions
     ```

4. **Add Proper Queue Position Tracking:**
   - Updated queue manager interface with get_position method
   - Added implementation in RabbitMQManager
   - Updated polling loop in chat.py to provide queue position information

5. **Improve Error Handling:**
   - Added notification utilities in frontend/src/utils/notifications.ts
   - Updated chat service error handling to show user-facing notifications
   - Enhanced error message content to be more descriptive

## Instructions for `/backend/app/queue/rabbitmq/manager.py`:

Add this method to the RabbitMQManager class:

```python
async def get_position(self, request: QueuedRequest) -> Optional[int]:
    """Get the position of a request in the queue"""
    try:
        await self.ensure_connected()
        
        # Check if this is the current request being processed
        current = self.processor.current_request
        if current and current.timestamp == request.timestamp:
            return 0
            
        # Get queue statistics for all priority levels
        queue_sizes = await self.get_queue_size()
        
        # We can only provide an estimated position since RabbitMQ doesn't easily allow 
        # searching for a specific message in a queue without consuming it
        # For now, we'll use a simplistic approach - requests in higher priority queues 
        # will be processed first
        position = 0
        
        # Add count of all higher priority queues
        for priority in sorted(queue_sizes.keys(), reverse=True):
            if priority > request.priority:
                position += queue_sizes[priority]
        
        # If we get here, the request is likely still in the queue
        # but we can't know its exact position
        # We'll return a reasonable estimate based on queue sizes
        return position
        
    except Exception as e:
        logger.error(f"Error getting request position: {str(e)}")
        return None
```

## Error Handling Updates

In messages with error handling, add notification dispatch like this:

```typescript
// Error handling in async operations
try {
  // Original code
} catch (error) {
  // Log the error
  console.error('Error:', error);
  
  // Show notification
  window.dispatchEvent(new CustomEvent('app:notification', { 
    detail: { 
      type: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error',
      title: 'Error' 
    } 
  }));
  
  // Existing error handling
}