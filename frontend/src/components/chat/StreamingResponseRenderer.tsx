import React, { useState, useEffect } from 'react';
import { useMessageStreaming } from '../../services/chat/StreamingContext';
import MessageParser from './MessageParser';

/**
 * Simplified streaming text renderer that directly displays content
 * received from StreamingContext
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
      <div className={`smooth-streaming-text ${isCurrentlyStreaming ? 'with-cursor' : ''}`}>
        <MessageParser content={displayContent} isStreaming={false} />
      </div>
    </div>
  );
};

export default StreamingResponseRenderer;