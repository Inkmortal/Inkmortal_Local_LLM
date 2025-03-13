import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import ChatMessage from './ChatMessage';
import { Message, MessageRole, MessageStatus } from '../../pages/chat/types/message';

interface ChatWindowProps {
  messages: Message[];
  isLoading?: boolean;
  isGenerating?: boolean;
  onRegenerate?: (messageId: string) => void;
  onStopGeneration?: () => void;
}

const ChatWindowFixed: React.FC<ChatWindowProps> = ({ 
  messages = [], 
  isLoading = false,
  isGenerating = false,
  onRegenerate,
  onStopGeneration
}) => {
  const { currentTheme } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Debug message updates - helps identify when component is receiving new data
  console.log(`[ChatWindowFixed] Rendering with ${messages.length} messages, isGenerating: ${isGenerating}, lastMsg content length: ${messages.length > 0 ? messages[messages.length-1]?.content?.length : 0}`);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Animation frame ref for performance
  const scrollRAFRef = useRef<number | null>(null);
  
  // Track when user has manually scrolled up
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  // Record the message count to detect new messages
  const previousMessageCountRef = useRef(messages.length);
  const previousGeneratingRef = useRef(isGenerating);
  
  // More reliable scroll to bottom function using requestAnimationFrame
  const scrollToBottom = useCallback((force = false) => {
    // Cancel any previous animation frame
    if (scrollRAFRef.current) {
      window.cancelAnimationFrame(scrollRAFRef.current);
    }
    
    // If user has scrolled up and we're not forcing, show the button instead
    if (userScrolledUp && !force) {
      setShowScrollButton(true);
      return;
    }
    
    // Otherwise scroll to bottom
    scrollRAFRef.current = window.requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end' 
        });
      }
      scrollRAFRef.current = null;
      
      // Hide the scroll button since we've scrolled to bottom
      if (showScrollButton) {
        setShowScrollButton(false);
      }
      
      // Reset user scrolled state when we've forced a scroll
      if (force) {
        setUserScrolledUp(false);
      }
    });
  }, [userScrolledUp, showScrollButton]);
  
  // Handle new messages or streaming changes
  useEffect(() => {
    // If no messages, don't do anything
    if (messages.length === 0) return;
    
    // When a new message appears, always scroll to bottom
    const isNewMessage = messages.length > previousMessageCountRef.current;
    
    // When generation starts, scroll to bottom
    const generationStarted = isGenerating && !previousGeneratingRef.current;
    
    // Update refs for next comparison
    previousMessageCountRef.current = messages.length;
    previousGeneratingRef.current = isGenerating;
    
    // When new messages arrive, let's scroll to them
    if (isNewMessage || generationStarted) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        scrollToBottom(true); // Force scroll for new messages
      }, 100);
    } else if (isGenerating) {
      // During streaming, scroll only if we're already at the bottom
      if (!userScrolledUp) {
        setTimeout(() => {
          scrollToBottom(false); // Don't force during streaming if user has scrolled up
        }, 50);
      }
    }
  }, [messages, isGenerating, scrollToBottom, userScrolledUp]);
  
  // Monitor scroll position to detect when user scrolls up
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // Consider "scrolled up" when more than 100px from bottom
    const isScrolledToBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 100;
    
    // Only update state if it's different to avoid unnecessary re-renders
    if (userScrolledUp !== !isScrolledToBottom) {
      setUserScrolledUp(!isScrolledToBottom);
    }
    
    // Show scroll button when not at bottom
    if (!isScrolledToBottom && !showScrollButton) {
      setShowScrollButton(true);
    } else if (isScrolledToBottom && showScrollButton) {
      setShowScrollButton(false);
    }
  }, [userScrolledUp, showScrollButton]);
  
  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (scrollRAFRef.current) {
        window.cancelAnimationFrame(scrollRAFRef.current);
      }
    };
  }, []);
  
  // Create background gradient with theme colors
  const backgroundGradients = useCallback(() => {
    // Extract colors for optimization
    const accentPrimary = currentTheme.colors.accentPrimary;
    const accentSecondary = currentTheme.colors.accentSecondary;
    const bgPrimary = currentTheme.colors.bgPrimary;
    
    return {
      backgroundImage: `
        radial-gradient(circle at 15% 15%, ${accentPrimary}10, transparent 40%),
        radial-gradient(circle at 85% 85%, ${accentSecondary}08, transparent 35%),
        radial-gradient(circle at 50% 50%, ${bgPrimary}30, ${bgPrimary})
      `
    };
  }, [
    currentTheme.colors.accentPrimary, 
    currentTheme.colors.accentSecondary, 
    currentTheme.colors.bgPrimary
  ]);
  
  const emptyStateContent = (
    <div className="w-full h-full flex items-center justify-center py-12">
      <div className="text-center max-w-md px-4">
        <div
          className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}15, ${currentTheme.colors.accentSecondary}15)`,
            border: `1px solid ${currentTheme.colors.borderColor}30`
          }}
        >
          <svg 
            className="w-8 h-8" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ color: currentTheme.colors.accentPrimary }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <h3 
          className="text-lg font-medium mb-2"
          style={{ color: currentTheme.colors.textPrimary }}
        >
          Start a new conversation
        </h3>
        <p 
          className="mb-6 text-sm"
          style={{ color: currentTheme.colors.textSecondary }}
        >
          Send a message to start chatting. You can ask questions,
          share files, create math expressions, or work with code.
        </p>
        
        <div className="grid grid-cols-2 gap-3 text-xs" style={{ color: currentTheme.colors.textMuted }}>
          <div 
            className="p-3 rounded-md flex flex-col items-center text-center"
            style={{ 
              backgroundColor: `${currentTheme.colors.bgSecondary}50`,
              border: `1px solid ${currentTheme.colors.borderColor}30`
            }}
          >
            <svg className="w-5 h-5 mb-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Math expressions
          </div>
          <div 
            className="p-3 rounded-md flex flex-col items-center text-center"
            style={{ 
              backgroundColor: `${currentTheme.colors.bgSecondary}50`,
              border: `1px solid ${currentTheme.colors.borderColor}30`
            }}
          >
            <svg className="w-5 h-5 mb-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Code blocks
          </div>
        </div>
      </div>
    </div>
  );
  return (
    <div 
      ref={containerRef}
      className="flex-grow overflow-y-auto p-4 relative"
      style={{ 
        backgroundColor: currentTheme.colors.bgPrimary,
        ...backgroundGradients(),
        height: "100%" /* Ensure container takes full height */
      }}
      onScroll={handleScroll}
    >
      <div className="w-full max-w-chat mx-auto relative">
        {/* Timeline decoration */}
        {messages.length > 0 && (
          <div 
            className="absolute left-4 top-5 bottom-5 w-[1px] hidden md:block"
            style={{ 
              background: `linear-gradient(to bottom, 
                transparent 0%, 
                ${currentTheme.colors.borderColor}30 15%, 
                ${currentTheme.colors.borderColor}30 85%, 
                transparent 100%
              )`,
              zIndex: 0
            }}
          />
        )}
        
        {/* Empty state when no messages */}
        {messages.length === 0 && !isLoading && emptyStateContent}
        
        {/* Message list */}
        {messages.map((message, index) => (
          <ChatMessage 
            key={message.id} 
            message={message}
            onRegenerate={onRegenerate ? () => onRegenerate(message.id) : undefined}
            onStopGeneration={onStopGeneration}
            isGenerating={
              isGenerating && 
              index === messages.length - 1 && 
              message.role === MessageRole.ASSISTANT
            }
            isLastMessage={index === messages.length - 1}
          />
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start mb-4 message-fade-in">
            <div 
              className="rounded-2xl px-4 py-3 max-w-[80%] rounded-tl-md relative overflow-hidden"
              style={{ 
                backgroundColor: currentTheme.colors.bgSecondary,
                color: currentTheme.colors.textPrimary,
                border: `1px solid ${currentTheme.colors.borderColor}40`,
                boxShadow: `
                  0 8px 20px rgba(0,0,0,0.08),
                  0 2px 8px rgba(0,0,0,0.04),
                  0 0 0 1px rgba(${parseInt(currentTheme.colors.accentPrimary.slice(1, 3), 16)}, 
                              ${parseInt(currentTheme.colors.accentPrimary.slice(3, 5), 16)}, 
                              ${parseInt(currentTheme.colors.accentPrimary.slice(5, 7), 16)}, 0.05)
                `,
              }}
            >
              {/* Top gradient bar */}
              <div 
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                  background: `linear-gradient(to right, ${currentTheme.colors.accentPrimary}50, ${currentTheme.colors.accentSecondary}50)`
                }}
              />
              
              <div className="flex space-x-3 items-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full animate-pulse" 
                    style={{ 
                      backgroundColor: currentTheme.colors.accentPrimary, 
                      animationDuration: '1.4s',
                      boxShadow: `0 0 10px ${currentTheme.colors.accentPrimary}50`
                    }}
                  ></div>
                  <div className="w-2 h-2 rounded-full animate-pulse" 
                    style={{ 
                      backgroundColor: currentTheme.colors.accentSecondary, 
                      animationDuration: '1.4s',
                      animationDelay: '0.2s',
                      boxShadow: `0 0 10px ${currentTheme.colors.accentSecondary}50`
                    }}
                  ></div>
                  <div className="w-2 h-2 rounded-full animate-pulse" 
                    style={{ 
                      backgroundColor: currentTheme.colors.accentTertiary, 
                      animationDuration: '1.4s',
                      animationDelay: '0.4s',
                      boxShadow: `0 0 10px ${currentTheme.colors.accentTertiary}50`
                    }}
                  ></div>
                </div>
                <span className="text-sm" style={{ color: currentTheme.colors.textMuted }}>Generating response...</span>
              </div>
              
              {/* Subtle background pattern */}
              <div 
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(${currentTheme.colors.accentPrimary}30 1px, transparent 1px)`,
                  backgroundSize: '20px 20px'
                }}
              />
            </div>
          </div>
        )}
        
        {/* End of messages marker for scrolling */}
        <div ref={messagesEndRef} className="h-4" />
      </div>
      
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          className="fixed bottom-24 right-8 z-50 p-3 rounded-full shadow-lg transition-all transform hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
            color: '#fff',
            boxShadow: `0 4px 12px ${currentTheme.colors.accentPrimary}40`
          }}
          onClick={() => scrollToBottom(true)}
          aria-label="Scroll to newest messages"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  );
};

// Optimize memoization with simpler comparison during streaming
export default memo(ChatWindowFixed, (prevProps, nextProps) => {
  // Always re-render on generation status change
  if (prevProps.isGenerating !== nextProps.isGenerating) return false;
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  
  // Check message content only when necessary
  if (nextProps.isGenerating !== prevProps.isGenerating) return false;
  
  // Check if messages array is undefined
  if (!prevProps.messages || !nextProps.messages) return false;
  
  // Check if messages array has changed
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  
  // During normal operation (no streaming), compare message content
  for (let i = 0; i < prevProps.messages.length; i++) {
    const prevMsg = prevProps.messages[i];
    const nextMsg = nextProps.messages[i];
    
    // Basic comparisons that are safe even during streaming
    if (prevMsg.id !== nextMsg.id) return false;
    if (prevMsg.content !== nextMsg.content) return false;
    if (prevMsg.status !== nextMsg.status) return false;
  }
  
  // Messages haven't changed in ways we care about
  return true;
});