import React, { useState, useEffect } from 'react';
import { useMessageStreaming } from '../../services/chat/StreamingContext';
import TokenAnimator from './TokenAnimator';

/**
 * Simplified streaming text renderer that displays content
 * received from StreamingContext with smooth character-by-character animation
 */
interface StreamingResponseRendererProps {
  content: string;
  isStreaming: boolean;
  messageId?: string;
  animationSpeed?: number; // Characters per second
}

const StreamingResponseRenderer: React.FC<StreamingResponseRendererProps> = ({ 
  content, 
  isStreaming,
  messageId,
  animationSpeed = 50 // Default 50 characters per second
}) => {
  // Subscribe to streaming updates for this message ID
  const streamingData = messageId ? useMessageStreaming(messageId) : null;
  
  // Local state for the content we're displaying
  const [displayContent, setDisplayContent] = useState(content);
  
  // Track if we're showing streaming content
  const [isCurrentlyStreaming, setIsCurrentlyStreaming] = useState(isStreaming);
  
  // Update local state when streaming data changes
  useEffect(() => {
    if (streamingData) {
      // Log content updates for debugging
      console.log(`[StreamingResponseRenderer] Received update for ${messageId}: ` +
        `length=${streamingData.content.length}, streaming=${streamingData.isStreaming}`);
      
      // Update our state with the streaming data
      setDisplayContent(streamingData.content);
      setIsCurrentlyStreaming(streamingData.isStreaming);
    } else {
      // Fall back to props if no streaming data
      setDisplayContent(content);
      setIsCurrentlyStreaming(isStreaming);
    }
  }, [streamingData, content, isStreaming, messageId]);
  
  return (
    <div className="smooth-streaming-container">
      <TokenAnimator 
        content={displayContent} 
        isStreaming={isCurrentlyStreaming}
        animationSpeed={animationSpeed}
      />
    </div>
  );
};

export default StreamingResponseRenderer;