# Chat System Integration Plan

## Overview
This plan outlines how to integrate the new chat implementation into the existing codebase, using logical naming and maintaining compatibility with the theming system.

## File Renaming Strategy
We will consolidate the codebase by using the most robust implementation without "V2" suffixes:

1. **Services**:
   - Keep `/services/websocket/WebSocketService.ts` (no suffix needed)
   - Keep `/services/api/chatService.ts` (no suffix needed)
   - Remove older versions of these services

2. **Types and Reducers**:
   - Keep `/pages/chat/types/message.ts` (no renaming needed)
   - Keep `/pages/chat/reducers/chatReducer.ts` (no renaming needed)

3. **Hooks**:
   - Replace `useChatState.tsx` with improved `useChat.ts` hook
   - Remove `TokenBufferManager.ts` after ensuring `TokenBuffer.ts` is integrated

4. **Components**:
   - Replace existing components with improved versions while removing V2 suffix:
     - `ChatMessage.tsx`: Replace with functionality from ChatMessageV2
     - `ChatInput.tsx`: Replace with functionality from ChatInputV2
     - `ChatWindow.tsx`: Replace with functionality from ChatWindowV2
     - `ChatHistorySidebar.tsx`: Create if needed, based on ChatHistorySidebarV2
   
5. **Pages**:
   - Update `ModernChatPage.tsx` with functionality from ChatPageV2 (keep the original name)

## Component Integration Steps

### 1. Review and Adapt Theme Integration
- Analyze current styling for chat components
- Ensure new components use the theme system correctly (via ThemeContext)
- Update any component-specific CSS with theme variables

### 2. Update Core Services
- Integrate WebSocketService
- Integrate chatService

### 3. Update State Management
- Integrate chatReducer and types
- Replace useChatState with useChat

### 4. Update Components
- Refactor ChatMessage
- Refactor ChatInput
- Refactor ChatWindow
- Refactor/create ChatHistorySidebar

### 5. Update Page Component
- Integrate the features from ChatPageV2 into ModernChatPage

### 6. Test and Verify
- Ensure all features from original implementation work
- Verify WebSocket connection and reconnection
- Test message streaming with section support
- Validate conversation history functionality

## Detailed Changes
For each file, we will:
1. Identify the original file's integrations (imports, context usage)
2. Preserve any unique features from original implementation
3. Integrate the more robust logic from V2 components
4. Remove V2 suffix from imports and components
5. Ensure consistent theming with the rest of the application