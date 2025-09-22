import React, { useState, useEffect, useRef, memo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import MessageParser from './MessageParser';
import StreamingResponseRenderer from './StreamingResponseRenderer';
import Button from '../ui/Button';
import { MessageRole, MessageStatus, MessageSection } from '../../pages/chat/types/message';
import { useMessageStreaming } from '../../services/chat/StreamingContext';

const LoadingDots = () => (
  <span className="loading-dots">
    <span className="dot">.</span>
    <span className="dot">.</span>
    <span className="dot">.</span>
  </span>
);

// Empty status indicator - we don't show any status indicators
const StatusIndicator = () => {
  return null;
};

export interface ChatMessageProps {
  message: {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: number;
    status?: MessageStatus;
    sections?: {
      response: MessageSection;
      thinking?: MessageSection;
    };
    metadata?: Record<string, any>;
  };
  onStopGeneration?: () => void;
  isGenerating?: boolean;
  isLastMessage?: boolean;
  showThinking?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  onStopGeneration,
  isGenerating,
  isLastMessage,
  showThinking = true
}) => {
  const { currentTheme } = useTheme();
  const messageRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [thinkingVisible, setThinkingVisible] = useState(showThinking);
  
  // Use streaming data from context if this is an assistant message
  const streamingInfo = message.role === MessageRole.ASSISTANT ? 
    useMessageStreaming(message.id) : null;
    
  useEffect(() => {
    if (streamingInfo && message.role === MessageRole.ASSISTANT) {
      console.log(`[ChatMessage] Streaming info for ${message.id}: isStreaming=${streamingInfo.isStreaming}, contentLength=${streamingInfo.content.length}`);
    }
  }, [message.id, message.role, streamingInfo]);
  
  const isAssistant = message.role === MessageRole.ASSISTANT;
  const isSystem = message.role === MessageRole.SYSTEM;
  const isUser = message.role === MessageRole.USER;
  const hasError = message.status === MessageStatus.ERROR;
  const isLoading = message.status === MessageStatus.PENDING || 
                 message.status === MessageStatus.SENDING ||
                 message.status === MessageStatus.QUEUED ||
                 message.status === MessageStatus.PROCESSING ||
                 message.status === MessageStatus.STREAMING;
                 
  // Check if we have thinking content - during streaming or after completion
  // Determine if this message is currently streaming
  // Use the streaming context data if available, otherwise fall back to message status
  // MOVED BEFORE hasStreamingThinking to fix hoisting issue
  const isStreaming = streamingInfo ?
    streamingInfo.isStreaming :
    message.status === MessageStatus.STREAMING;

  const hasThinking = isAssistant &&
                      message.sections?.thinking &&
                      message.sections.thinking.content.trim().length > 0;

  // During streaming, also check if content contains think tags
  const hasStreamingThinking = isStreaming && isAssistant &&
                               message.content &&
                               message.content.includes('<think>');
  
  // Get message content using a clear, consistent approach
  const getMessageContent = (msg: ChatMessageProps['message']) => {
    // For assistant messages with sections, use response section
    if (msg.role === MessageRole.ASSISTANT && msg.sections?.response?.content) {
      return msg.sections.response.content;
    }
    // Fallback to direct content (should always have content after our reducer fix)
    return msg.content || '';
  };
  
  // Use the helper function to get content to display
  const contentToShow = getMessageContent(message);
  
  // Debug the message content being passed to StreamingResponseRenderer
  useEffect(() => {
    if (isStreaming) {
      console.log(`[ChatMessage] Streaming message content for ${message.id}: ${contentToShow.substring(0, 30)}... (length: ${contentToShow.length})`);
    }
  }, [isStreaming, message.id, contentToShow]);
  
  // Animate message entrance
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Scroll into view if last message when content changes
  useEffect(() => {
    if (isLastMessage && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLastMessage, message.content]);
  
  const toggleThinking = () => {
    setThinkingVisible(!thinkingVisible);
  };
  
  return (
    <div 
      ref={messageRef}
      className={`chat-message ${isAssistant ? 'chat-message-assistant' : 'chat-message-user'} ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      data-role={message.role}
    >
      <div className={`message-content ${isUser ? 'user-message-content' : 'assistant-message-content'} ${
        hasError ? 'message-error' : ''
      } ${isLoading ? `message-${message.status?.toLowerCase()}` : ''}`}>
        {/* Main message content (or response section) */}
        <div className="prose max-w-none">
          {isStreaming ? (
            <StreamingResponseRenderer 
              content={contentToShow} 
              isStreaming={isStreaming}
              messageId={message.id}
            />
          ) : (
            <MessageParser 
              content={contentToShow}
              isStreaming={false}
            />
          )}
        </div>
        
        {/* Thinking section - show during streaming or after completion */}
        {(hasThinking || hasStreamingThinking) && (
          <div className="mt-2">
            <div
              className="cursor-pointer flex items-center text-xs opacity-70 hover:opacity-100 mb-1"
              onClick={toggleThinking}
            >
              <span className="mr-1">{thinkingVisible ? '▼' : '▶'}</span>
              <span>Model thinking {hasStreamingThinking ? '(streaming...)' : ''}</span>
            </div>

            {thinkingVisible && (
              <div className="thinking-section">
                <pre className="thinking-content overflow-auto">
                  {hasStreamingThinking ?
                    // Extract thinking content from raw message during streaming
                    (() => {
                      const thinkRegex = /<think>([\s\S]*?)(<\/think>|$)/gi;
                      const matches = [...(message.content || '').matchAll(thinkRegex)];
                      return matches.map(m => m[1]).join('').trim() || 'Thinking...';
                    })() :
                    // Use sections after streaming completes
                    message.sections?.thinking?.content.replace(/<think>|<\/think>/g, '')
                  }
                </pre>
              </div>
            )}
          </div>
        )}
        
        {/* Status indicators removed */}
        
        {/* Action buttons - only stop button, no regenerate */}
        {isAssistant && isLastMessage && isGenerating && onStopGeneration && (
          <div className="flex justify-end mt-3 space-x-2">
            <Button 
              onClick={onStopGeneration}
              variant="danger"
              size="sm"
            >
              Stop
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(ChatMessage, (prevProps, nextProps) => {
  // Return true if we should NOT re-render (props are equal)
  
  // Check IDs and control props
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.isGenerating !== nextProps.isGenerating) return false;
  if (prevProps.isLastMessage !== nextProps.isLastMessage) return false;
  if (prevProps.showThinking !== nextProps.showThinking) return false;
  
  // Check message state
  if (prevProps.message.status !== nextProps.message.status) return false;
  
  // Check content
  if (prevProps.message.content !== nextProps.message.content) return false;
  
  // Check sections
  const prevHasThinking = !!prevProps.message.sections?.thinking?.content;
  const nextHasThinking = !!nextProps.message.sections?.thinking?.content;
  
  if (prevHasThinking !== nextHasThinking) return false;
  
  if (prevHasThinking && nextHasThinking) {
    if (prevProps.message.sections?.thinking?.content !== nextProps.message.sections?.thinking?.content) {
      return false;
    }
    if (prevProps.message.sections?.thinking?.visible !== nextProps.message.sections?.thinking?.visible) {
      return false;
    }
  }
  
  if (prevProps.message.sections?.response?.content !== nextProps.message.sections?.response?.content) {
    return false;
  }
  
  // All props that would trigger a re-render are equal
  return true;
});