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

const StatusIndicator = ({ status, error }: { 
  status?: MessageStatus, 
  error?: string
}) => {
  if (!status || status === MessageStatus.COMPLETE) return null;
  
  switch(status) {
    case MessageStatus.SENDING:
      return <div className="text-xs text-blue-400 animate-pulse mt-1">Sending<LoadingDots /></div>;
    case MessageStatus.QUEUED:
      return <div className="text-xs text-yellow-400 mt-1">Waiting in queue<LoadingDots /></div>;
    case MessageStatus.PROCESSING:
      return <div className="text-xs text-green-400 animate-pulse mt-1">Processing<LoadingDots /></div>;
    case MessageStatus.STREAMING:
      // Removed animate-pulse to prevent flickering during streaming
      return <div className="text-xs text-green-400">Generating<LoadingDots /></div>;
    case MessageStatus.ERROR:
      return <div className="text-xs text-red-400 mt-1">{error || 'Error processing message'}</div>;
    default:
      return null;
  }
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
  onRegenerate?: () => void;
  onStopGeneration?: () => void;
  isGenerating?: boolean;
  isLastMessage?: boolean;
  showThinking?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  onRegenerate, 
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
                 
  const hasThinking = isAssistant && 
                      message.sections?.thinking && 
                      message.sections.thinking.content.trim().length > 0;
  
  // Determine if this message is currently streaming
  // Use the streaming context data if available, otherwise fall back to message status
  const isStreaming = streamingInfo ? 
    streamingInfo.isStreaming : 
    message.status === MessageStatus.STREAMING;
  
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
        
        {/* Thinking section */}
        {hasThinking && (
          <div className="mt-2">
            <div 
              className="cursor-pointer flex items-center text-xs opacity-70 hover:opacity-100 mb-1"
              onClick={toggleThinking}
            >
              <span className="mr-1">{thinkingVisible ? '▼' : '▶'}</span>
              <span>Model thinking</span>
            </div>
            
            {thinkingVisible && (
              <div className="thinking-section">
                <pre className="thinking-content overflow-auto">
                  {message.sections?.thinking?.content.replace(/<think>|<\/think>/g, '')}
                </pre>
              </div>
            )}
          </div>
        )}
        
        {/* Status indicator positioned at bottom right for better visibility */}
        <div className="flex justify-end mt-2">
          <StatusIndicator 
            status={message.status} 
            error={message.metadata?.error}
          />
        </div>
        
        {/* Action buttons */}
        {isAssistant && isLastMessage && (
          <div className="flex justify-end mt-3 space-x-2">
            {isGenerating && onStopGeneration ? (
              <Button 
                onClick={onStopGeneration}
                variant="danger"
                size="sm"
              >
                Stop
              </Button>
            ) : (
              onRegenerate && message.status === MessageStatus.COMPLETE && (
                <Button 
                  onClick={onRegenerate}
                  variant="secondary"
                  size="sm"
                >
                  Regenerate
                </Button>
              )
            )}
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