import React, { useMemo } from 'react';
import { Message, MessageRole, MessageStatus } from '../../pages/chat/types/message';
import MessageParser from './MessageParser';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onRetry?: () => void;
}

export const ChatMessageV2: React.FC<ChatMessageProps> = React.memo(
  ({ message, isStreaming = false, onRetry }) => {
    // Compute CSS classes for the message container
    const messageClasses = useMemo(() => {
      const classes = ['chat-message'];
      classes.push(`role-${message.role}`);
      classes.push(`status-${message.status}`);
      
      if (isStreaming) {
        classes.push('streaming');
      }
      
      return classes.join(' ');
    }, [message.role, message.status, isStreaming]);
    
    // Render thinking content if available
    const renderThinkingContent = useMemo(() => {
      if (!message.sections?.thinking?.content) return null;
      if (!message.sections.thinking.visible) return null;
      
      return (
        <div className="thinking-section">
          <div className="thinking-header">
            <span className="thinking-icon">💭</span>
            <span className="thinking-label">Thinking</span>
          </div>
          <div className="thinking-content prose prose-invert max-w-none">
            <MessageParser content={message.sections.thinking.content} />
          </div>
        </div>
      );
    }, [message.sections?.thinking]);
    
    // Render main content from either sections or main content field
    const renderContent = useMemo(() => {
      let content;
      
      if (message.sections?.response?.content) {
        content = message.sections.response.content;
      } else {
        content = message.content;
      }
      
      return (
        <div className="message-content prose prose-invert max-w-none">
          <MessageParser content={content || ""} />
        </div>
      );
    }, [message.sections?.response?.content, message.content]);
    
    // Render loading indicator for appropriate states
    const renderLoadingIndicator = useMemo(() => {
      if (
        message.status === MessageStatus.PENDING ||
        message.status === MessageStatus.SENDING ||
        (message.status === MessageStatus.STREAMING && isStreaming)
      ) {
        return (
          <div className="loading-indicator">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        );
      }
      
      return null;
    }, [message.status, isStreaming]);
    
    // Render error state with retry button
    const renderError = useMemo(() => {
      if (message.status === MessageStatus.ERROR) {
        return (
          <div className="error-indicator">
            <span className="error-icon">⚠️</span>
            <span className="error-message">Failed to generate response</span>
            {onRetry && (
              <button 
                className="retry-button"
                onClick={onRetry}
              >
                Retry
              </button>
            )}
          </div>
        );
      }
      
      return null;
    }, [message.status, onRetry]);
    
    // Determine avatar based on role
    const renderAvatar = useMemo(() => {
      if (message.role === MessageRole.USER) {
        return (
          <div className="message-avatar user-avatar">
            <span role="img" aria-label="User">👤</span>
          </div>
        );
      } else if (message.role === MessageRole.ASSISTANT) {
        return (
          <div className="message-avatar assistant-avatar">
            <span role="img" aria-label="Assistant">🤖</span>
          </div>
        );
      } else {
        return (
          <div className="message-avatar system-avatar">
            <span role="img" aria-label="System">ℹ️</span>
          </div>
        );
      }
    }, [message.role]);
    
    return (
      <div className={messageClasses} data-message-id={message.id}>
        {renderAvatar}
        <div className="message-container">
          {renderThinkingContent}
          {renderContent}
          {renderLoadingIndicator}
          {renderError}
        </div>
      </div>
    );
  },
  // Custom equality function to optimize re-renders
  (prevProps, nextProps) => {
    // Always re-render if streaming status changes
    if (prevProps.isStreaming !== nextProps.isStreaming) {
      return false;
    }
    
    // Always re-render if status changes
    if (prevProps.message.status !== nextProps.message.status) {
      return false;
    }
    
    // Re-render if content changes
    if (prevProps.message.content !== nextProps.message.content) {
      return false;
    }
    
    // Re-render if thinking or response sections change
    if (
      prevProps.message.sections?.thinking?.content !== 
      nextProps.message.sections?.thinking?.content ||
      prevProps.message.sections?.response?.content !== 
      nextProps.message.sections?.response?.content
    ) {
      return false;
    }
    
    // Otherwise, no need to re-render
    return true;
  }
);