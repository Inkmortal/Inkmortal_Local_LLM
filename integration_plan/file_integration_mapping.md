# File Integration Mapping

This document outlines how we'll integrate the new implementations into the existing file structure, maintaining the original file names and preserving their functionality.

## Core Services

| New File | Target File |
|----------|-------------|
| `/frontend/src/services/websocket/WebSocketService.ts` | Keep as is |
| `/frontend/src/services/api/chatService.ts` | Keep as is |

## Types and State Management

| New File | Target File |
|----------|-------------|
| `/frontend/src/pages/chat/types/message.ts` | Keep as is |
| `/frontend/src/pages/chat/reducers/chatReducer.ts` | Keep as is |
| `/frontend/src/pages/chat/utils/TokenBuffer.ts` | Keep as is |
| `/frontend/src/pages/chat/hooks/useChat.ts` | Replace `/frontend/src/pages/chat/hooks/useChatState.tsx` |

## Components

| New File (V2 Version) | Target File (Original) |
|----------|-------------|
| `/frontend/src/components/chat/ChatInputV2.tsx` | Update `/frontend/src/components/chat/ChatInput.tsx` |
| `/frontend/src/components/chat/ChatMessageV2.tsx` | Update `/frontend/src/components/chat/ChatMessage.tsx` |
| `/frontend/src/components/chat/ChatWindowV2.tsx` | Update `/frontend/src/components/chat/ChatWindow.tsx` |
| `/frontend/src/components/chat/ChatHistorySidebarV2.tsx` | Update existing sidebar or create new file |
| `/frontend/src/pages/chat/ChatPageV2.tsx` | Update `/frontend/src/pages/chat/ModernChatPage.tsx` |

## Integration Strategy

For each component:
1. Keep the original file's imports and theme integration
2. Replace the implementation logic with the new implementation from the V2 version
3. Preserve any special features from the original component (math editor, code editor, etc.)
4. Update prop types and function signatures to match the new implementation
5. Test the integration to ensure it works correctly

## Additions

We will add CSS styles for any new features. If needed, we'll update the following files:

| File | Purpose |
|------|---------|
| `/frontend/src/styles/modern-ui.css` | Add new styles for chat components |
| `/frontend/src/styles/markdown.css` | Update if needed for message rendering |
| `/frontend/src/styles/editor.css` | Update if needed for editor components |