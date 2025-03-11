import React, { useRef, useEffect } from 'react';
import { ChatMessageV2 } from './ChatMessageV2';
import { Message, MessageStatus } from '../../pages/chat/types/message';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onRetry?: (messageId: string) => void;
}

export const ChatWindowV2: React.FC<ChatWindowProps> = ({ 
  messages,
  isLoading,
  onRetry
}) => {
  const endRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Check if any message is currently streaming
  const hasStreamingMessage = messages.some(
    msg => msg.status === MessageStatus.STREAMING
  );
  
  // Handle empty state
  if (messages.length === 0) {
    return (
      <div className="chat-window empty-state">
        {isLoading ? (
          <div className="loading-indicator">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        ) : (
          <div className="empty-message">
            <h3>No messages yet</h3>
            <p>Start a conversation by typing a message below</p>
          </div>
        )}
      </div>
    );
  }
  
  // Handle retry action
  const handleRetry = (messageId: string) => {
    if (onRetry) {
      onRetry(messageId);
    }
  };
  
  return (
    <div className="chat-window">
      <div className="messages-container">
        {messages.map(message => (
          <ChatMessageV2
            key={message.id}
            message={message}
            isStreaming={message.status === MessageStatus.STREAMING}
            onRetry={
              message.status === MessageStatus.ERROR
                ? () => handleRetry(message.id)
                : undefined
            }
          />
        ))}
        
        {/* Loading indicator at bottom for new messages */}
        {isLoading && !hasStreamingMessage && (
          <div className="loading-message">
            <div className="loading-indicator">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
            <span>Loading messages...</span>
          </div>
        )}
        
        {/* Scroll anchor */}
        <div ref={endRef} className="scroll-anchor" />
      </div>
    </div>
  );
};