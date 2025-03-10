import React, { useState, useEffect, useRef, memo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import MessageParser from './MessageParser';
import Button from '../ui/Button';
import { MessageStatus } from '../../services/chat';

const LoadingDots = () => (
  <span className="loading-dots">
    <span className="dot">.</span>
    <span className="dot">.</span>
    <span className="dot">.</span>
  </span>
);

const StatusIndicator = ({ status, queuePosition, error }: { 
  status?: MessageStatus, 
  queuePosition?: number | null,
  error?: string
}) => {
  if (!status || status === MessageStatus.COMPLETE) return null;
  
  switch(status) {
    case MessageStatus.SENDING:
      return <div className="text-xs text-blue-400 animate-pulse mt-1">Sending<LoadingDots /></div>;
    case MessageStatus.QUEUED:
      return (
        <div className="text-xs text-yellow-400 mt-1">
          {queuePosition 
            ? `In queue (position ${queuePosition})<LoadingDots />` 
            : `Waiting in queue<LoadingDots />`}
        </div>
      );
    case MessageStatus.PROCESSING:
      return <div className="text-xs text-green-400 animate-pulse mt-1">Processing<LoadingDots /></div>;
    case MessageStatus.ERROR:
      return <div className="text-xs text-red-400 mt-1">{error || 'Error processing message'}</div>;
    default:
      return null;
  }
};

export interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    status?: MessageStatus;
    error?: string;
    queue_position?: number;
  };
  onRegenerate?: (messageId: string) => void;
  onStopGeneration?: () => void;
  isGenerating?: boolean;
  isLastMessage?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  onRegenerate, 
  onStopGeneration,
  isGenerating,
  isLastMessage
}) => {
  const { currentTheme } = useTheme();
  const messageRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';
  const isUser = message.role === 'user';
  const hasError = message.status === MessageStatus.ERROR;
  const isLoading = message.status === MessageStatus.SENDING || 
                   message.status === MessageStatus.QUEUED ||
                   message.status === MessageStatus.PROCESSING;
  
  // Animate message entrance
  useEffect(() => {
    // Wait a tiny bit to ensure DOM is ready
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Scroll into view if last message
  useEffect(() => {
    if (isLastMessage && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLastMessage, message.content]);
  
  // Determine message container classes
  const getContainerClasses = () => {
    let classes = 'p-4 rounded-lg max-w-3xl transition-all duration-300 mb-4 ';
    
    // Add animation class
    classes += isVisible ? 'opacity-100 translate-y-0 ' : 'opacity-0 translate-y-4 ';
    
    // Add role-specific styling
    if (isSystem) {
      classes += 'bg-gray-700 text-gray-200 mx-auto text-center max-w-lg ';
    } else if (isAssistant) {
      classes += `bg-${currentTheme.name}-700 text-${currentTheme.name}-50 mr-auto `;
    } else {
      classes += `bg-${currentTheme.name}-600 text-white ml-auto `;
    }
    
    // Add error state
    if (hasError) {
      classes += 'border-2 border-red-500 ';
    }
    
    // Add loading state
    if (isLoading) {
      classes += 'pulse-subtle ';
    }
    
    return classes.trim();
  };
  
  return (
    <div 
      ref={messageRef}
      className={getContainerClasses()}
      data-role={message.role}
    >
      {/* Message content */}
      <div className="prose prose-invert max-w-none">
        <MessageParser content={message.content} />
      </div>
      
      {/* Status indicator */}
      <StatusIndicator 
        status={message.status} 
        queuePosition={message.queue_position} 
        error={message.error} 
      />
      
      {/* Action buttons */}
      {isAssistant && isLastMessage && (
        <div className="flex justify-end mt-3 space-x-2">
          {isGenerating && onStopGeneration ? (
            <Button 
              onClick={onStopGeneration}
              variant="danger"
              size="sm"
            >
              Stop generating
            </Button>
          ) : (
            onRegenerate && (
              <Button 
                onClick={() => onRegenerate(message.id)}
                variant="secondary"
                size="sm"
                disabled={isLoading}
              >
                Regenerate
              </Button>
            )
          )}
        </div>
      )}
      
      {/* Error retry button */}
      {hasError && isUser && onRegenerate && (
        <div className="flex justify-end mt-3">
          <Button 
            onClick={() => onRegenerate(message.id)}
            variant="danger"
            size="sm"
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders when props haven't changed
export default memo(ChatMessage, (prevProps, nextProps) => {
  // Custom comparison function that only re-renders when necessary
  // Return true if we should NOT re-render (props are equal)
  
  // First check for message ID and React control props - these must always trigger re-render when changed
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.isGenerating !== nextProps.isGenerating) return false;
  if (prevProps.isLastMessage !== nextProps.isLastMessage) return false;
  
  // Next check message state - re-render when content or status changes
  if (prevProps.message.status !== nextProps.message.status) return false;
  if (prevProps.message.content !== nextProps.message.content) return false;
  
  // Check for error message changes
  if (prevProps.message.error !== nextProps.message.error) return false;
  
  // Check for queue position changes
  if (prevProps.message.queue_position !== nextProps.message.queue_position) return false;
  
  // All props that would trigger a re-render are equal
  return true;
});