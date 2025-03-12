import React, { useState, useEffect, useRef } from 'react';

/**
 * Component for rendering streaming text with visible token-by-token updates
 * This component directly interfaces with the DOM for maximum performance
 */
interface StreamingResponseRendererProps {
  content: string;
  isStreaming: boolean;
}

const StreamingResponseRenderer: React.FC<StreamingResponseRendererProps> = ({ 
  content, 
  isStreaming 
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [prevContent, setPrevContent] = useState("");
  const animationId = useRef<number | null>(null);
  
  // When content changes during streaming, highlight the new tokens
  useEffect(() => {
    // Only update when streaming and content has changed
    if (!isStreaming || content === prevContent) {
      return;
    }
    
    // Get new content since last update
    const newTokens = content.substring(prevContent.length);
    
    // If there are new tokens
    if (newTokens.length > 0) {
      // Create a container for the new tokens
      const tokenSpan = document.createElement('span');
      tokenSpan.className = 'new-token';
      tokenSpan.textContent = newTokens;
      
      // Add tokens to the DOM with animation
      if (contentRef.current) {
        contentRef.current.appendChild(tokenSpan);
        
        // Start animation to fade in the token
        if (animationId.current) {
          cancelAnimationFrame(animationId.current);
        }
        
        // Use requestAnimationFrame to ensure animation runs smoothly
        animationId.current = requestAnimationFrame(() => {
          tokenSpan.style.opacity = '1';
          animationId.current = null;
        });
      }
    }
    
    // Update previous content reference
    setPrevContent(content);
  }, [content, isStreaming, prevContent]);
  
  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
    };
  }, []);

  // Clear everything when streaming stops
  useEffect(() => {
    if (!isStreaming && contentRef.current) {
      // When streaming stops, remove animation classes
      if (contentRef.current) {
        contentRef.current.innerHTML = content;
      }
    }
  }, [isStreaming, content]);

  // Start fresh when streaming begins
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      // Reset when streaming starts
      contentRef.current.innerHTML = '';
      setPrevContent('');
    }
  }, [isStreaming]);

  return (
    <div className={isStreaming ? 'streaming-container' : ''}>
      <div 
        ref={contentRef} 
        className={`streaming-text ${isStreaming ? 'with-cursor' : ''}`}
        dangerouslySetInnerHTML={!isStreaming ? { __html: content } : undefined}
      />
      {isStreaming && <span className="streaming-cursor"></span>}
    </div>
  );
};

export default StreamingResponseRenderer;