import React, { useState, useEffect, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useMessageStreaming } from '../../services/chat/StreamingContext';

/**
 * Component for rendering streaming text with visible token-by-token updates
 * Uses React state management rather than direct DOM manipulation for better stability
 */
interface StreamingResponseRendererProps {
  content: string;
  isStreaming: boolean;
  messageId?: string; // Added message ID for direct subscription
}

const StreamingResponseRenderer: React.FC<StreamingResponseRendererProps> = ({ 
  content, 
  isStreaming,
  messageId
}) => {
  // Use the streaming context hook if messageId is provided
  const streamingData = messageId ? useMessageStreaming(messageId) : null;
  
  // Use streaming data if available, otherwise use props
  // Important: Check for undefined/null instead of falsy values to handle empty strings properly
  const effectiveContent = streamingData !== null && streamingData.content !== undefined ? 
    streamingData.content : content;
  const effectiveIsStreaming = streamingData !== null && streamingData.isStreaming !== undefined ? 
    streamingData.isStreaming : isStreaming;
    
  // Debug streaming data
  useEffect(() => {
    if (messageId && streamingData) {
      console.log(`[StreamingResponseRenderer] Updates for message ${messageId}: content length=${streamingData.content.length}, isStreaming=${streamingData.isStreaming}`);
    }
  }, [messageId, streamingData]);
  
  // Track previous content using a ref instead of state to ensure persistence across renders
  const prevContentRef = useRef("");
  
  // Store tokens as an array of {text, isNew} objects
  const [tokens, setTokens] = useState<Array<{text: string, isNew: boolean}>>([]);
  
  // Ref to store transition timers for better memory management
  const timerRef = useRef<number[]>([]);
  
  // Calculate new tokens when content changes
  useEffect(() => {
    console.log(`[StreamingResponseRenderer] Effect triggered: streaming=${effectiveIsStreaming}, contentLength=${effectiveContent.length}, prevLength=${prevContentRef.current.length}`);
    
    // Only update when streaming and content has changed
    if (!effectiveIsStreaming || effectiveContent === prevContentRef.current) {
      console.log('[StreamingResponseRenderer] Skipping update - no change or not streaming');
      return;
    }
    
    // Get new content since last update
    const newTokenText = effectiveContent.substring(prevContentRef.current.length);
    
    // If there are new tokens
    if (newTokenText.length > 0) {
      console.log(`[StreamingResponseRenderer] New token text: "${newTokenText.substring(0, 20)}${newTokenText.length > 20 ? '...' : ''}"`);
      
      // Add the new token to our tokens array
      // Using flushSync to ensure React updates the DOM immediately after this update
      // This prevents React from batching all streaming tokens into a single render
      flushSync(() => {
        setTokens(prevTokens => {
          const newTokens = [
            ...prevTokens,
            { text: newTokenText, isNew: true }
          ];
          console.log(`[StreamingResponseRenderer] Updated tokens array, now has ${newTokens.length} tokens`);
          return newTokens;
        });
      });
      
      // Set a timer to transition this token to normal state after animation
      const timerId = window.setTimeout(() => {
        // Also use flushSync here to ensure the token state update is visible immediately
        flushSync(() => {
          setTokens(currentTokens => 
            currentTokens.map((token, idx) => 
              idx === currentTokens.length - 1 ? { ...token, isNew: false } : token
            )
          );
        });
        
        // Remove this timer ID from our ref once it completes
        timerRef.current = timerRef.current.filter(id => id !== timerId);
      }, 150); // Reduced animation time for better responsiveness
      
      // Store the timer ID in our ref
      timerRef.current.push(timerId);
    } else {
      console.log('[StreamingResponseRenderer] No new token content detected');
    }
    
    // Update previous content reference - using the ref directly
    prevContentRef.current = effectiveContent;
  }, [effectiveContent, effectiveIsStreaming]);
  
  // Cleanup all transition timers on unmount
  useEffect(() => {
    return () => {
      timerRef.current.forEach(timerId => clearTimeout(timerId));
      timerRef.current = [];
    };
  }, []);

  // Handle streaming state changes and content transitions
  useEffect(() => {
    if (effectiveIsStreaming) {
      // Only reset when streaming STARTS (not during streaming)
      // This avoids resetting tokens that have already been accumulated
      if (tokens.length === 0) {
        // Force immediate render with flushSync
        flushSync(() => {
          setTokens([]);
        });
        prevContentRef.current = '';
        console.log('[StreamingResponseRenderer] Reset tokens and prevContent for new streaming message');
      }
    } else if (effectiveContent) {
      // Only update when streaming ENDS if content is not empty
      // This preserves content that was accumulated during streaming
      flushSync(() => {
        setTokens([{ text: effectiveContent, isNew: false }]);
      });
      
      // Update our reference to the complete content
      prevContentRef.current = effectiveContent;
      console.log('[StreamingResponseRenderer] Streaming ended, setting final content');
      
      // Clear any pending transitions
      timerRef.current.forEach(timerId => clearTimeout(timerId));
      timerRef.current = [];
    }
    // Don't reset if streaming ends with empty content
  }, [effectiveIsStreaming, effectiveContent, tokens.length]);
  
  // Render the tokens as React elements instead of using DOM manipulation
  const renderedContent = useMemo(() => {
    return tokens.map((token, index) => (
      <span 
        key={`token-${index}`} 
        className={token.isNew ? 'new-token' : ''}
      >
        {token.text}
      </span>
    ));
  }, [tokens]);

  return (
    <div className={effectiveIsStreaming ? 'streaming-container' : ''}>
      <div className={`streaming-text ${effectiveIsStreaming ? 'with-cursor' : ''}`}>
        {renderedContent}
      </div>
      {effectiveIsStreaming && <span className="streaming-cursor"></span>}
    </div>
  );
};

export default StreamingResponseRenderer;