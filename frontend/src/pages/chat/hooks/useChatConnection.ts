/**
 * WebSocket connection management hook
 * 
 * Centralized hook for establishing and maintaining WebSocket connections
 * for real-time chat functionality.
 */
import { useCallback, useRef, useEffect } from 'react';
import { ChatActionType } from '../reducers/chatReducer';
import {
  isWebSocketConnected,
  waitForWebSocketConnection,
  addConnectionListener,
  closeWebSocket,
  ConnectionStatus
} from '../../../services/chat/websocketService';

/**
 * Hook for managing WebSocket connections in chat interface
 * This is the single source of truth for WebSocket connections
 * Message handling is done through StreamingContext.
 * 
 * @param tokenRef Reference to auth token
 * @param dispatch Reducer dispatch function
 * @param state Current chat state
 * @returns WebSocket connection management functions
 */
export function useChatConnection(
  tokenRef: React.MutableRefObject<string | null>,
  dispatch: React.Dispatch<any>,
  state: any
) {
  const wsConnectedRef = useRef(false);
  const connectionListenerRef = useRef<(() => void) | null>(null);
  
  /**
   * Connect WebSocket with improved reliability
   * Memoized to prevent re-connections
   */
  const connectWebSocket = useCallback(async (): Promise<boolean> => {
    const token = tokenRef.current;
    
    if (!token) {
      console.error("Cannot connect WebSocket - no authentication token");
      wsConnectedRef.current = false;
      dispatch({ 
        type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
        payload: false 
      });
      return false;
    }
    
    try {
      console.log("[useChatConnection] Centralized connection attempt");
      
      // Check if already connected first
      if (isWebSocketConnected()) {
        console.log("[useChatConnection] WebSocket already connected");
        wsConnectedRef.current = true;
        dispatch({ 
          type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
          payload: true 
        });
        return true;
      }
      
      // Use waitForWebSocketConnection with timeout - this is now the single point of connection
      const connected = await waitForWebSocketConnection(token, 5000);
      wsConnectedRef.current = connected;
      
      console.log(`[useChatConnection] WebSocket connection: ${connected ? 'SUCCESS' : 'FAILED'}`);
      
      // Update UI state
      dispatch({ 
        type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
        payload: connected 
      });
      
      return wsConnectedRef.current;
    } catch (error) {
      console.error('[useChatConnection] Error connecting to WebSocket:', error);
      wsConnectedRef.current = false;
      
      // Update UI state
      dispatch({ 
        type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
        payload: false 
      });
      
      return false;
    }
  }, [dispatch, tokenRef]);
  
  // Set up connection status listener once
  useEffect(() => {
    // Clean up any previous listener
    if (connectionListenerRef.current) {
      connectionListenerRef.current();
      connectionListenerRef.current = null;
    }
    
    // Setup connection listener for changes
    connectionListenerRef.current = addConnectionListener((connected) => {
      wsConnectedRef.current = connected;
      console.log(`[useChatConnection] WebSocket connection state changed: ${connected ? 'connected' : 'disconnected'}`);
      
      // Update reducer state to trigger UI changes
      dispatch({ 
        type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
        payload: connected 
      });
    });
    
    // Clean up on unmount
    return () => {
      if (connectionListenerRef.current) {
        connectionListenerRef.current();
        connectionListenerRef.current = null;
      }
      
      // Clean up WebSocket connection only when leaving the chat area completely
      if (!window.location.pathname.includes('/chat')) {
        console.log('[useChatConnection] Leaving chat area, closing WebSocket connection');
        closeWebSocket();
      } else {
        console.log('[useChatConnection] Staying in chat area, keeping WebSocket connection alive');
      }
    };
  }, [dispatch]);
  
  return {
    connectWebSocket,
    isWebSocketConnected: () => wsConnectedRef.current
  };
}