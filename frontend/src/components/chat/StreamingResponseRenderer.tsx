import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Component for rendering streaming text with visible token-by-token updates
 * Uses React state management rather than direct DOM manipulation for better stability
 */
interface StreamingResponseRendererProps {
  content: string;
  isStreaming: boolean;
}

const StreamingResponseRenderer: React.FC<StreamingResponseRendererProps> = ({ 
  content, 
  isStreaming 
}) => {
  // Track previous content to identify new tokens
  const [prevContent, setPrevContent] = useState("");
  
  // Store tokens as an array of {text, isNew} objects
  const [tokens, setTokens] = useState<Array<{text: string, isNew: boolean}>>([]);
  
  // Ref to store transition timers for better memory management
  const timerRef = useRef<number[]>([]);
  
  // Calculate new tokens when content changes
  useEffect(() => {
    // Only update when streaming and content has changed
    if (!isStreaming || content === prevContent) {
      return;
    }
    
    // Get new content since last update
    const newTokenText = content.substring(prevContent.length);
    
    // If there are new tokens
    if (newTokenText.length > 0) {
      // Add the new token to our tokens array
      setTokens(prevTokens => [
        ...prevTokens,
        { text: newTokenText, isNew: true }
      ]);
      
      // Set a timer to transition this token to normal state after animation
      const timerId = window.setTimeout(() => {
        setTokens(currentTokens => 
          currentTokens.map((token, idx) => 
            idx === currentTokens.length - 1 ? { ...token, isNew: false } : token
          )
        );
        
        // Remove this timer ID from our ref once it completes
        timerRef.current = timerRef.current.filter(id => id !== timerId);
      }, 500); // Match this to CSS animation duration
      
      // Store the timer ID in our ref
      timerRef.current.push(timerId);
    }
    
    // Update previous content reference
    setPrevContent(content);
  }, [content, isStreaming, prevContent]);
  
  // Cleanup all transition timers on unmount
  useEffect(() => {
    return () => {
      timerRef.current.forEach(timerId => clearTimeout(timerId));
      timerRef.current = [];
    };
  }, []);

  // Handle streaming state changes and content transitions
  useEffect(() => {
    if (isStreaming) {
      // Only reset when streaming STARTS (not during streaming)
      // This avoids resetting tokens that have already been accumulated
      if (tokens.length === 0) {
        setTokens([]);
        setPrevContent('');
      }
    } else if (content) {
      // Only update when streaming ENDS if content is not empty
      // This preserves content that was accumulated during streaming
      setTokens([{ text: content, isNew: false }]);
      
      // Clear any pending transitions
      timerRef.current.forEach(timerId => clearTimeout(timerId));
      timerRef.current = [];
    }
    // Don't reset if streaming ends with empty content
  }, [isStreaming, content, tokens.length]);
  
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
    <div className={isStreaming ? 'streaming-container' : ''}>
      <div className={`streaming-text ${isStreaming ? 'with-cursor' : ''}`}>
        {renderedContent}
      </div>
      {isStreaming && <span className="streaming-cursor"></span>}
    </div>
  );
};

export default StreamingResponseRenderer;