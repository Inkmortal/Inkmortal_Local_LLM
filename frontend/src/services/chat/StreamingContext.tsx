/**
 * StreamingContext - React Context for Streaming Message Updates
 * 
 * This provides a clean React-based architecture for handling 
 * streaming message updates from WebSockets.
 */
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { subscribeToMessageUpdates, registerMessageId } from './websocketService';
import { MessageUpdate } from './types';
import { ContentUpdateMode, MessageStatus } from '../../pages/chat/types/message';

// Define the context interface
interface StreamingContextValue {
  // Subscribe to updates for a specific message ID
  subscribeToMessage: (messageId: string, callback: (content: string, isComplete: boolean) => void) => () => void;
  
  // Register message ID mapping between frontend and backend
  registerMessageIdMapping: (frontendId: string, backendId: string, conversationId: string) => void;
  
  // Get current content for a message ID
  getMessageContent: (messageId: string) => string;
  
  // Check if a message is currently streaming
  isMessageStreaming: (messageId: string) => boolean;
}

// Create the context with a default value
const StreamingContext = createContext<StreamingContextValue>({
  subscribeToMessage: () => () => {},
  registerMessageIdMapping: () => {},
  getMessageContent: () => '',
  isMessageStreaming: () => false,
});

// Props for the provider component
interface StreamingProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for streaming message context
 */
export const StreamingProvider: React.FC<StreamingProviderProps> = ({ children }) => {
  // Store per-message callbacks and content
  const messageCallbacks = useRef(new Map<string, Set<(content: string, isComplete: boolean) => void>>());
  const messageContents = useRef(new Map<string, string>());
  const messageStatus = useRef(new Map<string, MessageStatus>());
  
  // Handler for WebSocket message updates
  const handleMessageUpdate = useCallback((update: MessageUpdate) => {
    const { messageId, content, contentUpdateMode, status, isComplete, metadata } = update;
    
    if (!messageId) return;
    
    // Debug messages to help diagnose streaming issues
    console.log(`[StreamingContext] Received update for message ${messageId}: ` +
      `content=${content ? content.substring(0, 10) + '...' : '[empty]'}, ` +
      `mode=${contentUpdateMode}, status=${status}, isComplete=${isComplete}`);
    
    // Skip empty content updates (likely metadata-only)
    if (!content && !isComplete) {
      console.log(`[StreamingContext] Skipping empty content update for message ${messageId}`);
      return;
    }
    
    // Update content based on update mode
    if (content !== undefined) {
      const currentContent = messageContents.current.get(messageId) || '';
      
      // Update content based on the specified update mode
      let newContent;
      if (contentUpdateMode === ContentUpdateMode.REPLACE) {
        newContent = content;
      } else {
        // For append mode, add the new content
        newContent = currentContent + content;
      }
      
      // Store the new content
      messageContents.current.set(messageId, newContent);
      
      console.log(`[StreamingContext] Updated content for ${messageId}, total length: ${newContent.length}`);
      
      // Update status
      if (status) {
        messageStatus.current.set(messageId, status);
      }
      
      // Notify all callbacks for this message ID
      const callbacks = messageCallbacks.current.get(messageId);
      if (callbacks) {
        console.log(`[StreamingContext] Notifying ${callbacks.size} subscribers for message ${messageId}`);
        
        // Use setTimeout to break React's update batching
        // This ensures each update is rendered independently
        setTimeout(() => {
          callbacks.forEach(callback => {
            try {
              callback(newContent, isComplete === true);
            } catch (error) {
              console.error(`Error in streaming callback for message ${messageId}:`, error);
            }
          });
        }, 0);
      } else {
        console.log(`[StreamingContext] No subscribers for message ${messageId}`);
      }
    } else if (isComplete) {
      // Handle completion messages that might not have content
      // but need to update the completion status
      const currentContent = messageContents.current.get(messageId) || '';
      
      // Update status
      messageStatus.current.set(messageId, status);
      
      // Notify subscribers of completion
      const callbacks = messageCallbacks.current.get(messageId);
      if (callbacks) {
        console.log(`[StreamingContext] Notifying completion for message ${messageId}`);
        callbacks.forEach(callback => {
          try {
            callback(currentContent, true);
          } catch (error) {
            console.error(`Error in completion callback for message ${messageId}:`, error);
          }
        });
      }
    }
  }, []);
  
  // Subscribe to message updates on mount
  useEffect(() => {
    const unsubscribe = subscribeToMessageUpdates(handleMessageUpdate);
    
    return () => {
      unsubscribe();
      messageCallbacks.current.clear();
      messageContents.current.clear();
      messageStatus.current.clear();
    };
  }, [handleMessageUpdate]);
  
  // Subscribe to updates for a specific message
  const subscribeToMessage = useCallback((
    messageId: string, 
    callback: (content: string, isComplete: boolean) => void
  ) => {
    // Create a set for this message ID if it doesn't exist
    if (!messageCallbacks.current.has(messageId)) {
      messageCallbacks.current.set(messageId, new Set());
    }
    
    // Add callback to the set
    const callbacks = messageCallbacks.current.get(messageId)!;
    callbacks.add(callback);
    
    // Call immediately with current content if available
    const currentContent = messageContents.current.get(messageId);
    if (currentContent !== undefined) {
      const isComplete = messageStatus.current.get(messageId) === MessageStatus.COMPLETE;
      callback(currentContent, isComplete);
    }
    
    // Return unsubscribe function
    return () => {
      const callbackSet = messageCallbacks.current.get(messageId);
      if (callbackSet) {
        callbackSet.delete(callback);
        if (callbackSet.size === 0) {
          messageCallbacks.current.delete(messageId);
        }
      }
    };
  }, []);
  
  // Register message ID mapping
  const registerMessageIdMapping = useCallback((
    frontendId: string,
    backendId: string,
    conversationId: string
  ) => {
    registerMessageId(frontendId, backendId, conversationId);
  }, []);
  
  // Get current content for a message
  const getMessageContent = useCallback((messageId: string) => {
    return messageContents.current.get(messageId) || '';
  }, []);
  
  // Check if a message is currently streaming
  const isMessageStreaming = useCallback((messageId: string) => {
    return messageStatus.current.get(messageId) === MessageStatus.STREAMING;
  }, []);
  
  // Create the context value
  const contextValue: StreamingContextValue = {
    subscribeToMessage,
    registerMessageIdMapping,
    getMessageContent,
    isMessageStreaming,
  };
  
  return (
    <StreamingContext.Provider value={contextValue}>
      {children}
    </StreamingContext.Provider>
  );
};

/**
 * Hook for subscribing to streaming message updates
 */
export const useMessageStreaming = (messageId?: string) => {
  const [content, setContent] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const streaming = useContext(StreamingContext);
  
  // Subscribe to message updates
  useEffect(() => {
    if (!messageId) return;
    
    // Using the context to subscribe
    const unsubscribe = streaming.subscribeToMessage(messageId, (newContent, complete) => {
      setContent(newContent);
      setIsComplete(complete);
      setIsStreaming(!complete);
    });
    
    // Get initial content if available
    const initialContent = streaming.getMessageContent(messageId);
    if (initialContent) {
      setContent(initialContent);
    }
    
    // Check initial streaming status
    setIsStreaming(streaming.isMessageStreaming(messageId));
    
    return unsubscribe;
  }, [messageId, streaming]);
  
  return {
    content,
    isComplete,
    isStreaming
  };
};

/**
 * Register a message ID mapping
 */
export const useRegisterMessageId = () => {
  const streaming = useContext(StreamingContext);
  
  return useCallback((frontendId: string, backendId: string, conversationId: string) => {
    console.log(`[useRegisterMessageId] Registering mapping: frontend=${frontendId}, backend=${backendId}, conversation=${conversationId}`);
    streaming.registerMessageIdMapping(frontendId, backendId, conversationId);
  }, [streaming]);
};

export default StreamingContext;