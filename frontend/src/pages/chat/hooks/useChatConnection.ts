/**
 * Legacy WebSocket connection management hook
 * 
 * This is a compatibility wrapper for the new ChatConnectionContext.
 * For new code, use the context directly: import { useChatConnection } from '../../../services/chat/ChatConnectionContext';
 */
import { useCallback, useEffect, useRef } from 'react';
import { ChatActionType } from '../reducers/chatReducer';
import { useChatConnection as useConnectionContext } from '../../../services/chat/ChatConnectionContext';

/**
 * Hook for managing WebSocket connections in chat interface
 * LEGACY COMPATIBILITY VERSION
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
  const connection = useConnectionContext();
  
  // Update reducer state when connection status changes
  useEffect(() => {
    // Set up connection listener for changes
    const unsubscribe = connection.addConnectionListener((connected) => {
      wsConnectedRef.current = connected;
      console.log(`[useChatConnection-legacy] WebSocket connection state changed: ${connected ? 'connected' : 'disconnected'}`);
      
      // Update reducer state to trigger UI changes
      dispatch({ 
        type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
        payload: connected 
      });
    });
    
    // Initial update
    wsConnectedRef.current = connection.isConnected;
    dispatch({ 
      type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
      payload: connection.isConnected 
    });
    
    // Clean up on unmount
    return () => {
      unsubscribe();
    };
  }, [dispatch, connection]);
  
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
      console.log("[useChatConnection-legacy] Centralized connection attempt");
      
      // Check if already connected first
      if (connection.isConnected) {
        console.log("[useChatConnection-legacy] WebSocket already connected");
        wsConnectedRef.current = true;
        dispatch({ 
          type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
          payload: true 
        });
        return true;
      }
      
      // Connect using the connection context
      const connected = await connection.connect(token);
      wsConnectedRef.current = connected;
      
      console.log(`[useChatConnection-legacy] WebSocket connection: ${connected ? 'SUCCESS' : 'FAILED'}`);
      
      // Update UI state
      dispatch({ 
        type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
        payload: connected 
      });
      
      return wsConnectedRef.current;
    } catch (error) {
      console.error('[useChatConnection-legacy] Error connecting to WebSocket:', error);
      wsConnectedRef.current = false;
      
      // Update UI state
      dispatch({ 
        type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
        payload: false 
      });
      
      return false;
    }
  }, [dispatch, tokenRef, connection]);
  
  return {
    connectWebSocket,
    isWebSocketConnected: () => wsConnectedRef.current
  };
}