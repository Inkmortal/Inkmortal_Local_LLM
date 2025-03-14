/**
 * WebSocket connection management hook
 * 
 * Handles establishing and maintaining WebSocket connections
 * for real-time chat functionality.
 */
import { useCallback, useRef } from 'react';
import { ChatActionType } from '../reducers/chatReducer';
import {
  initializeWebSocket,
  isWebSocketConnected,
  waitForWebSocketConnection,
  addConnectionListener
} from '../../../services/chat/websocketService';

/**
 * Hook for managing WebSocket connections in chat interface
 * Simplified to focus only on connection management, not message handling.
 * Message handling is now done through StreamingContext.
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
      console.log("Attempting to initialize WebSocket connection...");
      
      // Check if already connected first
      if (isWebSocketConnected()) {
        console.log("WebSocket already connected, no need to initialize");
        wsConnectedRef.current = true;
        dispatch({ 
          type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
          payload: true 
        });
        return true;
      }
      
      // Use the new waitForWebSocketConnection function with timeout
      const connected = await waitForWebSocketConnection(token, 5000);
      wsConnectedRef.current = connected;
      
      console.log(`WebSocket initialization result: ${connected ? 'SUCCESS' : 'FAILED'}`);
      
      // Update UI state
      dispatch({ 
        type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
        payload: connected 
      });
      
      if (connected) {
        // Setup connection listener for changes
        const unregisterListener = addConnectionListener((connected) => {
          wsConnectedRef.current = connected;
          console.log(`WebSocket connection state changed: ${connected ? 'connected' : 'disconnected'}`);
          
          // Update reducer state to trigger UI changes
          dispatch({ 
            type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
            payload: connected 
          });
        });
        
        // No need to register a global message handler at all
        // StreamingContext now handles all WebSocket updates directly
        const unregisterGlobalHandler = () => {};
        
        console.log("WebSocket connection listeners and handlers registered");
      } else {
        console.warn("WebSocket connection failed or timed out");
      }
      
      return wsConnectedRef.current;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      wsConnectedRef.current = false;
      
      // Update UI state
      dispatch({ 
        type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
        payload: false 
      });
      
      return false;
    }
  }, []); // No dependencies - avoid reconnecting when messages change
  
  return {
    connectWebSocket,
    isWebSocketConnected: () => wsConnectedRef.current
  };
}