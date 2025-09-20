# Installation and Setup Guide

## Backend Changes

1. **Auth Router Modularization**

The large router file has been broken down into smaller modules:

- `auth/login/router.py` - Authentication endpoints
- `auth/users/router.py` - User management
- `auth/tokens/router.py` - Registration token management
- `auth/api_keys/router.py` - API key management
- `auth/queue_integration/router.py` - Queue position tracking

2. **Queue Position Tracking**

Added `get_position` method to `rabbitmq/manager.py`:

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
        
        # Estimate position (since RabbitMQ doesn't support direct queue searching)
        position = 0
        
        # Add count of all higher priority queues
        for priority in sorted(queue_sizes.keys(), reverse=True):
            if priority > request.priority:
                position += queue_sizes[priority]
        
        return position
    except Exception as e:
        logger.error(f"Error getting request position: {str(e)}")
        return None
```

## Frontend Changes

1. **Notification System**

Added `notifications.ts` helper:

```typescript
export function showError(message: string, title: string = 'Error'): void {
  showNotification({
    type: 'error',
    message,
    title
  });
}
```

And `Notification.tsx` component for toast displays.

2. **Updated Error Handling**

Added improved error handling in message and conversation services:

```typescript
// Show error notification to user
const errorMessage = response.error || 'Failed to send message to server';
showError(errorMessage, 'Message Error');
```

## Installation Steps

1. Create the following new files:
   - backend/app/auth/login/router.py
   - backend/app/auth/users/router.py
   - backend/app/auth/tokens/router.py
   - backend/app/auth/api_keys/router.py
   - backend/app/auth/queue_integration/router.py
   - frontend/src/utils/notifications.ts
   - frontend/src/components/ui/Notification.tsx

2. Add the `get_position` implementation to Queue manager

3. Update imports in App.tsx to include NotificationProvider