# Chat Backend Integration Plan

## Overview

This implementation plan details the step-by-step process to connect the frontend chat interface with the backend API. The focus is on establishing reliable communication between the React frontend and FastAPI backend while properly handling authentication, queue management, and conversation data.

## Current Status

- Frontend: React/TypeScript with modular chat service implementation
- Backend: FastAPI with authenticated endpoints and RabbitMQ queue integration
- Authentication: JWT-based auth system implemented on both sides
- Integration progress: Chat service restructured with message status tracking and error handling

## Remaining Issues

- Session management: Authentication not persisting between tabs/refreshes
- Conversation history: Random new conversations being created unexpectedly
- Admin dashboard: Queue information not accurate, cards not updating properly
- UI/UX: Ongoing conversations disrupted by navigation

## Implementation Goals

1. Connect frontend chat UI to backend API endpoints ✅
2. Implement proper error handling and loading states ✅
3. Add conversation history management ✅
4. Support file uploads
5. Handle queue timeouts gracefully

## Key Files

### Frontend
- `/frontend/src/services/chat/` - Modular API services for chat
  - `types.ts` - Type definitions and interfaces
  - `errorHandling.ts` - Error handling utilities
  - `messageService.ts` - Message operations
  - `conversationService.ts` - Conversation operations
  - `index.ts` - Re-exports everything
- `/frontend/src/pages/chat/hooks/useChatState.tsx` - Chat state management with status tracking
- `/frontend/src/components/chat/ChatInput.tsx` - Message input component
- `/frontend/src/components/chat/ChatMessage.tsx` - Message display component with status indicators
- `/frontend/src/pages/chat/ModernChatPage.tsx` - Main chat page
- `/frontend/src/pages/chat/components/sidebars/HistorySidebar/HistorySidebar.tsx` - Conversation history sidebar

### Backend
- `/backend/app/api/chat.py` - Chat API endpoints
- `/backend/app/queue/interface.py` - Queue interface
- `/backend/app/auth/utils.py` - Authentication utilities
- `/backend/app/config.py` - Configuration settings

## Step-by-Step Implementation Plan

### 1. Review API Configuration (1-2 interactions) ✅

**Tasks:**
- [x] Examine `frontend/src/config/api.ts` to verify API base URL
- [x] Check authentication header setup in API utility
- [x] Verify error handling for API responses
- [x] Update typings for API responses if needed

**Notes:**
- Authentication headers confirmed to include JWT token
- Error handling updated to account for network issues, authentication failures, and server errors
- Response typings now match backend response format

### 2. Update ChatService Interface (2-3 interactions) ✅

**Tasks:**
- [x] Review existing methods in `chatService.ts`
- [x] Update the ChatResponse interface to match backend response format
- [x] Update the ChatRequestParams interface to include all needed parameters
- [x] Add conversation listing method signature
- [x] Add conversation title update method signature

**Notes:**
- Created modular structure in `/frontend/src/services/chat/` directory
- Created `types.ts` with proper interfaces and typings
- Added JSDoc comments for all methods and interfaces
- Implemented re-export pattern in `index.ts` for backward compatibility

### 3. Implement sendMessage Method (1-2 interactions) ✅

**Tasks:**
- [x] Update sendMessage method to connect to backend `/api/chat/message` endpoint
- [x] Implement proper error handling for network failures
- [x] Add support for request timeout
- [x] Handle authentication errors

**Notes:**
- Created dedicated `messageService.ts` for message-related operations
- Implemented handling for both text-only messages and file uploads
- Used FormData for file uploads, JSON for text-only
- Added typed responses with appropriate error handling

### 4. Implement Conversation Methods (1-2 interactions) ✅

**Tasks:**
- [x] Implement createConversation method connecting to `/api/chat/conversation` endpoint
- [x] Implement getConversation method connecting to `/api/chat/conversation/{id}` endpoint
- [x] Implement listConversations method connecting to `/api/chat/conversations` endpoint
- [x] Add updateConversationTitle method (if backend supports it)

**Notes:**
- Created dedicated `conversationService.ts` for conversation operations
- Added comprehensive error handling for all methods
- Implemented proper authentication error identification
- Added typed response data matching backend format

### 5. Update Message Status Tracking (2-3 interactions) ✅

**Tasks:**
- [x] Add message status enum (SENDING, QUEUED, PROCESSING, COMPLETE, ERROR)
- [x] Modify Message interface to include status field
- [x] Update useChatState to track message status
- [x] Implement status transitions based on API responses

**Notes:**
- Created MessageStatus enum with five states (SENDING, QUEUED, PROCESSING, COMPLETE, ERROR)
- Added status and error fields to Message interface
- Updated useChatState to manage message status transitions
- Implemented proper error handling with status updates
- Added support for queue position tracking when available

### 6. Enhance useChatState Loading States (1-2 interactions) ✅

**Tasks:**
- [x] Refine loading state management in useChatState
- [x] Add differentiated states for network loading vs queue processing
- [x] Implement visual feedback for each state
- [x] Handle transition between states properly

**Notes:**
- Added granular loading states (initial load, sending, queued, processing, receiving)
- Implemented separate flags for different loading scenarios (isNetworkLoading, isQueueLoading, isProcessing)
- Added proper state transitions based on message status
- Connected loading indicators to UI components

### 7. Implement Basic Conversation History (2-3 interactions) ✅

**Tasks:**
- [x] Update loadConversation method to fetch from backend
- [x] Implement conversation listing in sidebar
- [x] Add conversation selection functionality
- [x] Store current conversation ID in state or URL

**Notes:**
- Updated HistorySidebar component with conversation selection
- Added loading states for conversation fetching
- Implemented URL-based conversation tracking
- Connected conversation history UI to backend API

### 8. Add Error Handling for Common Scenarios (1-2 interactions) ✅

**Tasks:**
- [x] Implement handler for authentication errors (401)
- [x] Add specific handling for queue timeouts (504)
- [x] Create user-friendly error messages for different error types
- [x] Add retry functionality for recoverable errors

**Notes:**
- Authentication errors now redirect to login
- Timeout errors offer retry option
- Network errors are clearly communicated
- All errors are logged for debugging purposes

### 9. Update ChatInput for File Uploads (2-3 interactions)

**Tasks:**
- [ ] Add file input field to ChatInput component
- [ ] Implement file selection handler
- [ ] Add file preview functionality
- [ ] Connect file upload to sendMessage method

**Notes:**
- Support image uploads initially
- Add file size validation
- Provide visual feedback during upload
- Handle upload errors gracefully

### 10. Implement Basic File Upload UI (1-2 interactions)

**Tasks:**
- [ ] Create file upload button in chat interface
- [ ] Add drag-and-drop support if possible
- [ ] Implement file type filtering (images, PDFs)
- [ ] Show upload progress indicator

**Notes:**
- Focus on simple, intuitive UI
- Support file removal before sending
- Show thumbnails for images when possible

### 11. Update ChatMessage Component (1-2 interactions) ✅

**Tasks:**
- [x] Modify ChatMessage to display different states (sending, error)
- [x] Add retry button for failed messages
- [x] Implement loading indicator for messages in queue
- [x] Add timeout indicator for long-processing messages

**Notes:**
- Added visual distinctions between message states
- Implemented clear error feedback for users
- Added retry functionality for failed messages
- Created condensed view for system messages

### 12. Implement Conversation Persistence (1-2 interactions)

**Tasks:**
- [ ] Add local storage backup for draft messages
- [ ] Implement conversation state persistence between page loads
- [ ] Add recovery mechanism for unsent messages
- [ ] Ensure state is cleared properly on logout

**Notes:**
- Store minimal data needed for recovery
- Clear sensitive data on logout
- Handle state restoration on page load
- Consider session storage vs local storage tradeoffs

### 13. Add Queue Position Indicator (1-2 interactions)

**Tasks:**
- [ ] Check if backend provides queue position information
- [ ] Update useChatState to track queue position
- [ ] Add visual indicator for position in queue
- [ ] Implement estimated time display if possible

**Notes:**
- Only applicable if backend supports position reporting
- Should update dynamically if possible
- Consider fallback for when position isn't available

### 14. Implement Regeneration Functionality (1-2 interactions)

**Tasks:**
- [ ] Add regenerate button to assistant messages
- [ ] Implement regeneration logic in useChatState
- [ ] Connect to backend regeneration endpoint if available
- [ ] Handle regeneration errors properly

**Notes:**
- May require re-sending the previous user message
- Should replace the existing assistant message
- Consider optimistic UI updates

### 15. Test Authentication Flow (1-2 interactions)

**Tasks:**
- [ ] Verify chat endpoints require authentication
- [ ] Test token expiration scenarios
- [ ] Implement token refresh mechanism if needed
- [ ] Add proper error handling for auth failures

**Notes:**
- Test both with and without valid tokens
- Handle expired tokens gracefully
- Redirect to login when needed
- Consider silent token refresh

### 16. Add End-to-End Tests (2-3 interactions)

**Tasks:**
- [ ] Test conversation creation flow
- [ ] Test message sending and receiving
- [ ] Test file upload functionality
- [ ] Test error scenarios and recovery

**Notes:**
- Focus on critical user paths
- Test with actual backend when possible
- Verify correct error handling
- Test authentication requirements

### 17. Optimize Performance (1-2 interactions)

**Tasks:**
- [ ] Review and optimize API call frequency
- [ ] Implement request debouncing where appropriate
- [ ] Add request cancellation for abandoned operations
- [ ] Consider caching for frequently accessed data

**Notes:**
- Balance responsiveness and server load
- Consider mobile performance
- Monitor network utilization
- Use React.memo and useMemo where appropriate

### 18. Final Integration Test (1-2 interactions)

**Tasks:**
- [ ] Verify all components work together
- [ ] Test full conversation flow
- [ ] Check error handling in integrated system
- [ ] Validate file upload in full system

**Notes:**
- Test on different browsers
- Verify mobile responsiveness
- Check performance under load
- Confirm all error states are handled

## Testing Checklist

- [ ] Authentication works properly
- [ ] Messages are sent and received correctly
- [x] Conversations can be created and loaded
- [ ] File uploads work as expected
- [x] Error scenarios are handled gracefully
- [x] Queue status is displayed correctly
- [x] Network issues are handled properly
- [x] UI states reflect backend status accurately

## Future Enhancements

1. Streaming responses for faster feedback
2. WebSocket integration for real-time updates
3. Offline support with message queueing
4. Advanced file handling (multiple files, larger uploads)
5. Message searching and filtering
6. Conversation management (rename, delete, share)
7. Notification system for new messages

## Recent Bug Fixes

1. **LangChain 404 Error Fix**:
   - Added proper model validation in processor.py
   - Implemented fail-fast when model isn't available
   - Fixed URL construction for the LangChain client

2. **Conversation Deletion Fix**:
   - Improved transaction handling with proper isolation
   - Added row-locking to prevent race conditions
   - Modified frontend retry logic with exponential backoff

3. **Model Selection Persistence**:
   - Added database storage for model settings
   - Created config table to store selected model
   - Modified config.py to load model from database on startup

## Next Steps

Priority tasks to fix the remaining issues:

1. Fix authentication persistence between tabs/navigation
2. Debug and fix random conversation creation issues
3. Fix admin dashboard queue monitoring
4. Complete file upload functionality