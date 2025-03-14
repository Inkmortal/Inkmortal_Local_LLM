import React, { useState, useEffect } from 'react';
import { useMessageStreaming } from '../../services/chat/StreamingContext';

/**
 * Simplified streaming text renderer that directly displays content
 * without complex token animations
 */
interface StreamingResponseRendererProps {
  content: string;
  isStreaming: boolean;
  messageId?: string;
}

const StreamingResponseRenderer: React.FC<StreamingResponseRendererProps> = ({ 
  content, 
  isStreaming,
  messageId
}) => {
  // Use direct streaming data or fallback to props
  const streamingData = messageId ? useMessageStreaming(messageId) : null;
  
  // Local state for the content we're displaying
  const [displayContent, setDisplayContent] = useState(content);
  
  // Track if we're showing streaming content
  const [isCurrentlyStreaming, setIsCurrentlyStreaming] = useState(isStreaming);
  
  // Debug streaming data
  useEffect(() => {
    if (messageId && streamingData) {
      console.log(`[StreamingResponseRenderer] Updates for message ${messageId}: content length=${streamingData.content.length}, isStreaming=${streamingData.isStreaming}`);
    }
  }, [messageId, streamingData]);
  
  // Update local state when streaming data or props change
  useEffect(() => {
    // If we have streaming data, use it
    if (streamingData) {
      setDisplayContent(streamingData.content);
      setIsCurrentlyStreaming(streamingData.isStreaming);
    } else {
      // Otherwise fall back to props
      setDisplayContent(content);
      setIsCurrentlyStreaming(isStreaming);
    }
  }, [streamingData, content, isStreaming]);
  
  return (
    <div className={isCurrentlyStreaming ? 'streaming-container' : ''}>
      <div className={`streaming-text ${isCurrentlyStreaming ? 'with-cursor' : ''}`}>
        {/* Render the content directly without token splitting */}
        {displayContent}
      </div>
      {isCurrentlyStreaming && <span className="streaming-cursor"></span>}
    </div>
  );
};

export default StreamingResponseRenderer;