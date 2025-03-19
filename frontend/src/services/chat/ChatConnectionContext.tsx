/**
 * ChatConnectionContext
 * 
 * Centralized connection management for chat WebSocket connections.
 * This manages a single, persistent WebSocket connection for the entire chat experience.
 * 
 * IMPORTANT: This context is the SINGLE SOURCE OF TRUTH for WebSocket connections.
 * All components should use this context via useChatConnection() hook instead of
 * directly accessing connectionManager or websocketService.
 */
import React, { createContext, useContext, useEffect, useCallback, useState, useRef } from 'react';
import { ConnectionStatus } from './websocketService';
import { connectionManager } from './connectionManager';

// Define a global type for accessing the connection manager outside React context
declare global {
  interface Window {
    __chatConnection?: any;
    _currentWebSocketToken?: string;
  }
}

// Define the context interface
interface ChatConnectionContextValue {
  // Connection state
  isConnected: boolean;
  
  // Connection API
  connect: (token: string) => Promise<boolean>;
  disconnect: () => void;
  
  // Connection validation 
  validateConnection: () => boolean;
  
  // For sending messages
  sendMessage: (message: any) => boolean;

  // For listening to connection changes
  addConnectionListener: (callback: (isConnected: boolean) => void) => () => void;
}

// Create the context with default values
const ChatConnectionContext = createContext<ChatConnectionContextValue>({
  isConnected: false,
  connect: () => Promise.resolve(false),
  disconnect: () => {},
  validateConnection: () => false,
  sendMessage: () => false,
  addConnectionListener: () => () => {}
});

interface ChatConnectionProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for chat connection management
 * - Creates and maintains a single persistent WebSocket connection
 * - Exposes connection methods via React context
 * - Also makes connection available globally for non-React contexts
 */
export const ChatConnectionProvider: React.FC<ChatConnectionProviderProps> = ({ children }) => {
  // Track connection state
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const tokenRef = useRef<string | null>(null);
  const listenerCleanupRef = useRef<(() => void) | null>(null);
  const contextValueRef = useRef<ChatConnectionContextValue | null>(null);
  
  // Get token from localStorage on mount and establish early connection
  useEffect(() => {
    console.log('[ChatConnectionContext] Initializing persistent connection management');
    
    // CRITICAL FIX: Use consistent token retrieval order (auth_token OR token)
    tokenRef.current = localStorage.getItem('auth_token') || localStorage.getItem('token');
    
    // Set up connection status listener
    const cleanup = connectionManager.addConnectionListener((connected: boolean) => {
      console.log(`[ChatConnectionContext] Connection status changed: ${connected ? 'CONNECTED' : 'DISCONNECTED'}`);
      setIsConnected(connected);
    });
    
    listenerCleanupRef.current = cleanup;
    
    // Get initial connection status
    const initialStatus = connectionManager.isConnected();
    setIsConnected(initialStatus);
    console.log(`[ChatConnectionContext] Initial connection status: ${initialStatus ? 'CONNECTED' : 'DISCONNECTED'}`);
    
    // Immediately try to establish connection if we have a token
    if (tokenRef.current && !initialStatus) {
      console.log('[ChatConnectionContext] Auto-establishing persistent connection on provider mount');
      connectionManager.connect(tokenRef.current)
        .then(success => {
          console.log(`[ChatConnectionContext] Initial connection ${success ? 'SUCCEEDED' : 'FAILED'}`);
        })
        .catch(err => {
          console.error('[ChatConnectionContext] Error establishing initial connection:', err);
        });
    }
    
    // Make connection manager methods available to non-React contexts via global
    if (typeof window !== 'undefined') {
      console.log('[ChatConnectionContext] Exposing connection manager to global scope for non-React contexts');
      window.__chatConnection = {
        isConnected: () => connectionManager.isConnected(),
        validateConnection: () => connectionManager.validateConnection(),
        sendMessage: (message: any) => connectionManager.sendMessage(message),
        connect: (token: string) => connectionManager.connect(token)
      };
      
      // CRITICAL FIX: Also store token for use by other non-React contexts
      if (tokenRef.current) {
        window._currentWebSocketToken = tokenRef.current;
        console.log('[ChatConnectionContext] Stored auth token in window._currentWebSocketToken for reconnection');
      }
    }
    
    // Cleanup on unmount
    return () => {
      console.log('[ChatConnectionContext] Provider unmounting, cleaning up resources');
      if (listenerCleanupRef.current) {
        listenerCleanupRef.current();
      }
      
      // Remove global reference on unmount
      if (typeof window !== 'undefined' && window.__chatConnection) {
        delete window.__chatConnection;
      }
    };
  }, []);
  
  // Connect to WebSocket
  const connect = useCallback(async (token: string): Promise<boolean> => {
    console.log('[ChatConnectionContext] Connecting to WebSocket');
    
    // Store token for reconnection
    tokenRef.current = token;
    
    try {
      // If already connected, return true immediately
      if (connectionManager.isConnected()) {
        console.log('[ChatConnectionContext] Already connected');
        return true;
      }
      
      // Connect and wait for result
      const connected = await connectionManager.connect(token);
      
      console.log(`[ChatConnectionContext] Connection result: ${connected}`);
      return connected;
    } catch (error) {
      console.error('[ChatConnectionContext] Connection error:', error);
      return false;
    }
  }, []);
  
  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    console.log('[ChatConnectionContext] Disconnecting from WebSocket');
    connectionManager.closeConnection();
  }, []);
  
  // Validate connection
  const validateConnection = useCallback((): boolean => {
    return connectionManager.validateConnection();
  }, []);
  
  // Send a message over the WebSocket
  const sendMessage = useCallback((message: any): boolean => {
    // Validate connection first
    if (!connectionManager.validateConnection()) {
      console.warn('[ChatConnectionContext] Cannot send message - connection not validated');
      
      // Try to reconnect if we have a token
      if (tokenRef.current) {
        console.log('[ChatConnectionContext] Attempting to reconnect before sending message');
        connectionManager.connect(tokenRef.current).catch(error => {
          console.error('[ChatConnectionContext] Reconnection failed:', error);
        });
      }
      
      return false;
    }
    
    // Send the message
    return connectionManager.sendMessage(message);
  }, []);
  
  // Add a connection listener
  const addConnectionListener = useCallback((callback: (connected: boolean) => void) => {
    return connectionManager.addConnectionListener(callback);
  }, []);
  
  // Create the context value
  const contextValue: ChatConnectionContextValue = {
    isConnected,
    connect,
    disconnect,
    validateConnection,
    sendMessage,
    addConnectionListener
  };
  
  return (
    <ChatConnectionContext.Provider value={contextValue}>
      {children}
    </ChatConnectionContext.Provider>
  );
};

/**
 * Custom hook to use chat connection context
 */
export const useChatConnection = () => {
  const context = useContext(ChatConnectionContext);
  if (!context) {
    throw new Error('useChatConnection must be used within a ChatConnectionProvider');
  }
  return context;
};

export default ChatConnectionContext;