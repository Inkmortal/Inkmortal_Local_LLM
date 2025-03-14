import React, { useState, useEffect, useRef } from 'react';
import { useMessageStreaming } from '../../services/chat/StreamingContext';
import MessageParser from './MessageParser';

/**
 * Improved streaming text renderer with smoother animation
 * and proper JSON handling for model metadata
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
  
  // Local state for the processed content we're displaying
  const [displayContent, setDisplayContent] = useState(content);
  
  // Track if we're showing streaming content
  const [isCurrentlyStreaming, setIsCurrentlyStreaming] = useState(isStreaming);
  
  // Ref to track previous content length for smooth animation
  const prevContentLengthRef = useRef(0);
  
  // No longer needed - JSON metadata is handled at the messageHandler level
  
  // Update local state when streaming data or props change
  useEffect(() => {
    // If we have streaming data, use it
    if (streamingData) {
      // Only update if content has actually changed
      if (streamingData.content.length !== prevContentLengthRef.current) {
        setDisplayContent(streamingData.content);
        prevContentLengthRef.current = streamingData.content.length;
      }
      
      setIsCurrentlyStreaming(streamingData.isStreaming);
    } else {
      // Otherwise fall back to props
      setDisplayContent(content);
      setIsCurrentlyStreaming(isStreaming);
      prevContentLengthRef.current = content.length;
    }
  }, [streamingData, content, isStreaming]);
  
  return (
    <div className="smooth-streaming-container">
      <div className={`smooth-streaming-text ${isCurrentlyStreaming ? 'with-cursor' : ''}`}>
        <MessageParser content={displayContent} isStreaming={isCurrentlyStreaming} />
      </div>
    </div>
  );
};

export default StreamingResponseRenderer;