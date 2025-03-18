/**
 * ChatConnectionContext
 * 
 * Centralized connection management for chat WebSocket connections.
 * This manages a single, persistent WebSocket connection for the entire chat experience.
 */
import React, { createContext, useContext, useEffect, useCallback, useState, useRef } from 'react';
import { ConnectionStatus } from './websocketService';
import { connectionManager } from './connectionManager';

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
 */
export const ChatConnectionProvider: React.FC<ChatConnectionProviderProps> = ({ children }) => {
  // Track connection state
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const tokenRef = useRef<string | null>(null);
  const listenerCleanupRef = useRef<(() => void) | null>(null);
  
  // Get token from localStorage on mount
  useEffect(() => {
    tokenRef.current = localStorage.getItem('token') || localStorage.getItem('auth_token');
    
    // Set up connection status listener
    const cleanup = connectionManager.addConnectionListener((connected: boolean) => {
      setIsConnected(connected);
    });
    
    listenerCleanupRef.current = cleanup;
    
    // Get initial connection status
    setIsConnected(connectionManager.isConnected());
    
    // Cleanup on unmount
    return () => {
      if (listenerCleanupRef.current) {
        listenerCleanupRef.current();
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