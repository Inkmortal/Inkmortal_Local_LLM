# useChat Hook Integration

This document outlines how to integrate the new `useChat` hook with the existing `useChatState` to preserve all functionality while improving the architecture.

## Key Differences

1. **State Management**:
   - `useChatState` uses direct useState calls
   - `useChat` uses a reducer pattern with atomic updates

2. **Conversation Handling**:
   - `useChatState` has conversational history functions
   - `useChat` has a more streamlined approach

3. **Message Processing**:
   - `useChatState` has complex token handling with direct state updates
   - `useChat` has a more clean separation via the TokenBuffer

4. **Special Features**:
   - `useChatState` has file uploads, math editor, code editor integrations
   - `useChat` focuses on core messaging functionality

## Integration Approach

We'll create an enhanced `useChat` hook that:

1. Uses the reducer pattern from the new implementation
2. Preserves all the special features from useChatState
3. Implements the more robust WebSocket handling
4. Maintains the same API surface for backward compatibility

## Implementation Details

```typescript
import { useReducer, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  chatReducer, 
  initialChatState, 
  ChatActionType 
} from '../reducers/chatReducer';
import {
  Message,
  MessageRole,
  MessageStatus,
  ContentUpdateMode,
  Conversation
} from '../types/message';
import { TokenBuffer } from '../utils/TokenBuffer';
import { 
  webSocketService, 
  parseMessageUpdate 
} from '../../../services/websocket/WebSocketService';
import * as chatApi from '../../../services/api/chatService';
import { showError, showInfo, showSuccess } from '../../../utils/notifications';

export interface ChatState {
  messages: Message[];
  conversations: Conversation[];
  activeConversationId: string | null;
  conversationId: string | null;  // Alias for backward compatibility
  isLoading: boolean;
  isNetworkLoading: boolean;
  isGenerating: boolean;

  // Core Actions
  sendMessage: (content: string, file?: File | null) => Promise<void>;
  regenerateLastMessage: () => Promise<void>;
  stopGeneration: () => void;
  loadConversation: (conversationId: string) => Promise<void>;
  startNewConversation: () => void;
  loadConversations: () => Promise<void>;
  setActiveConversationId: (id: string | null) => void;
  
  // Legacy support aliases (for backward compatibility)
  handleSendMessage: (content: string, file?: File | null) => Promise<void>;
  handleRegenerate: (messageId: string) => Promise<void>;
  handleStopGeneration: () => void;
  switchConversation: (id: string) => Promise<void>;
  
  // File handling props
  showFileUpload: boolean;
  setShowFileUpload: (show: boolean) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  handleFileSelect: (file: File) => void;
  
  // Editor refs and handlers
  codeInsertRef: React.MutableRefObject<((codeSnippet: string) => void) | undefined>;
  mathInsertRef: React.MutableRefObject<((mathSnippet: string) => void) | undefined>;
  handleInsertCode: (language?: string, template?: string) => void;
  handleInsertMath: (formula?: string) => void;
  
  // Queue properties
  isQueueLoading: boolean;
  isProcessing: boolean;
  queuePosition: number;
  isConnected: boolean;
}

interface UseChatOptions {
  initialConversationId?: string;
  authToken: string;
  debug?: boolean;
}

export function useChat({
  initialConversationId,
  authToken,
  debug = false
}: UseChatOptions): ChatState {
  // Use the improved reducer pattern for state management
  const [state, dispatch] = useReducer(chatReducer, {
    ...initialChatState,
    activeConversationId: initialConversationId || null,
  });
  
  // Additional state for UI features not in the reducer
  const [isLoading, setIsLoading] = useState(false);
  const [isNetworkLoading, setIsNetworkLoading] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Refs to track resources that need cleanup
  const tokenBufferRef = useRef<TokenBuffer | null>(null);
  const activeMessageIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const initialLoadDoneRef = useRef(false);
  const wsHandlersRef = useRef<(() => void)[]>([]);
  const connectedRef = useRef<boolean>(false);
  
  // Editor refs for code and math
  const codeInsertRef = useRef<((codeSnippet: string) => void) | undefined>(undefined);
  const mathInsertRef = useRef<((mathSnippet: string) => void) | undefined>(undefined);
  
  // Connect to WebSocket
  useEffect(() => {
    if (!authToken) return;
    
    // Connect to the WebSocket server
    webSocketService.connect(authToken);
    
    // Register status handler
    const statusCleanup = webSocketService.addStatusHandler(connected => {
      if (debug) {
        console.log(`[Chat] WebSocket connection status: ${connected ? 'connected' : 'disconnected'}`);
      }
      connectedRef.current = connected;
    });
    
    // Register message handler
    const messageCleanup = webSocketService.addMessageHandler(message => {
      if (debug) {
        console.log('[Chat] WebSocket message received:', message);
      }
      
      // Parse message update
      const update = parseMessageUpdate(message);
      
      if (!update) return;
      
      // Update message in state
      dispatch({
        type: ChatActionType.UPDATE_MESSAGE,
        payload: update
      });
      
      // If message is complete, clean up resources
      if (update.isComplete && activeMessageIdRef.current === update.messageId) {
        if (debug) {
          console.log('[Chat] Message complete, cleaning up resources');
        }
        
        activeMessageIdRef.current = null;
        
        if (tokenBufferRef.current) {
          tokenBufferRef.current.dispose();
          tokenBufferRef.current = null;
        }
      }
    });
    
    // Store cleanup functions
    wsHandlersRef.current = [statusCleanup, messageCleanup];
    
    return () => {
      // Cleanup WebSocket handlers
      wsHandlersRef.current.forEach(cleanup => cleanup());
      wsHandlersRef.current = [];
    };
  }, [authToken, debug]);
  
  // ... include all other functions (loadConversations, sendMessage, etc.)
  
  // Extract messages for active conversation
  const getActiveConversationMessages = useCallback(() => {
    if (!state.activeConversationId) return [];
    
    return Object.values(state.messages)
      .filter(msg => msg.conversationId === state.activeConversationId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [state.activeConversationId, state.messages]);
  
  const messages = getActiveConversationMessages();
  
  return {
    // Core state
    messages,
    conversations: Object.values(state.conversations),
    activeConversationId: state.activeConversationId,
    conversationId: state.activeConversationId, // Alias for backward compatibility 
    isLoading,
    isNetworkLoading,
    isGenerating,
    
    // Core actions
    sendMessage: handleSendMessage,
    regenerateLastMessage: handleRegenerateLastMessage,
    stopGeneration: handleStopGeneration,
    loadConversation: handleLoadConversation,
    startNewConversation: handleStartNewConversation,
    loadConversations,
    setActiveConversationId,
    
    // Legacy support with aliases
    handleSendMessage,
    handleRegenerate: (messageId: string) => handleRegenerateLastMessage(),
    handleStopGeneration,
    switchConversation: handleLoadConversation,
    
    // File handling
    showFileUpload,
    setShowFileUpload,
    selectedFile,
    setSelectedFile,
    handleFileSelect,
    
    // Editor refs and handlers
    codeInsertRef,
    mathInsertRef,
    handleInsertCode,
    handleInsertMath,
    
    // Queue state
    isQueueLoading,
    isProcessing,
    queuePosition,
    isConnected: connectedRef.current
  };
}
```

## Next Steps

1. Complete the implementation of all functions
2. Test the integration with the WebSocketService
3. Update the ModernChatPage to use this implementation
4. Testing with focus on special features