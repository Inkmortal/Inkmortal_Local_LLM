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

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  messages = [], 
  isLoading = false,
  isGenerating = false,
  onRegenerate,
  onStopGeneration
}) => {
  const { currentTheme } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Scroll state tracking
  const [atBottom, setAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  // Performance optimization - track last scroll position
  const lastScrollPositionRef = useRef(0);
  const scrollTresholdRef = useRef(150); // Distance from bottom to be considered "at bottom"
  const userHasScrolledRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if user is at bottom of chat
  const isAtBottom = useCallback(() => {
    if (!containerRef.current) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollHeight - scrollTop - clientHeight < scrollTresholdRef.current;
  }, []);
  
  // Smooth scroll to bottom with animation frame for performance
  const scrollToBottom = useCallback((smooth = true) => {
    if (!messagesEndRef.current || !containerRef.current) return;
    
    // If already at bottom, no need to scroll
    if (isAtBottom() && !showScrollButton) return;
    
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
      
      // Hide scroll button after scrolling to bottom
      setShowScrollButton(false);
      setAtBottom(true);
      
      // Reset user scroll state after returning to bottom
      setTimeout(() => {
        userHasScrolledRef.current = false;
      }, 100);
    });
  }, [isAtBottom, showScrollButton]);
  
  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    // Get current scroll position
    const { scrollTop } = containerRef.current;
    const scrollingUp = scrollTop < lastScrollPositionRef.current;
    lastScrollPositionRef.current = scrollTop;
    
    // Check if we're at the bottom
    const bottom = isAtBottom();
    
    // If the user has scrolled manually
    if (Math.abs(scrollTop - lastScrollPositionRef.current) > 10) {
      userHasScrolledRef.current = true;
    }
    
    // Update state only if there's a change to reduce renders
    if (bottom !== atBottom) {
      setAtBottom(bottom);
    }
    
    // Show/hide scroll button with a slight delay to prevent flashing
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      // Only show button if we're not at the bottom
      setShowScrollButton(!bottom);
      scrollTimeoutRef.current = null;
    }, 200);
  }, [atBottom, isAtBottom]);
  
  // Add message change auto-scrolling effect
  useEffect(() => {
    // If no messages, don't scroll
    if (messages.length === 0) return;
    
    // If user has scrolled up and we have a new message, show the button
    if (messages.length > 0 && !atBottom && !userHasScrolledRef.current) {
      setShowScrollButton(true);
      return;
    }
    
    // Auto-scroll on new messages or if we're at the bottom
    if (atBottom || !userHasScrolledRef.current) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        scrollToBottom(true);
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, atBottom, scrollToBottom]);
  
  // Auto-scroll during message generation
  useEffect(() => {
    if (!isGenerating) return;
    
    // Don't auto-scroll if user has manually scrolled up
    if (userHasScrolledRef.current && !atBottom) {
      return;
    }
    
    // Create a debounced interval to smooth out scrolling during generation
    const intervalId = setInterval(() => {
      if (isGenerating && atBottom) {
        scrollToBottom(false); // Use non-smooth scrolling for better performance during streaming
      }
    }, 300);
    
    return () => clearInterval(intervalId);
  }, [isGenerating, atBottom, scrollToBottom]);
  
  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
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
  
  
  // Log message rendering for debugging
  useEffect(() => {
    if (messages.length > 0) {
      console.log(`[ChatWindow] Rendering ${messages.length} messages`);
      messages.forEach(msg => {
        console.log(`[ChatWindow] Message: id=${msg.id}, role=${msg.role}, conversation=${msg.conversationId}, content length=${msg.content?.length || 0}`);
      });
    } else {
      console.log('[ChatWindow] No messages to render');
    }
  }, [messages.length]);

  return (
    <div 
      ref={containerRef}
      className="flex-grow overflow-y-auto p-4 modern-scrollbar relative"
      style={{ 
        backgroundColor: currentTheme.colors.bgPrimary,
        ...backgroundGradients()
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
        
        {/* Empty state message when conversation exists but has no messages */}
        {messages.length === 0 && (
          <div className="w-full h-96 flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <h3 className="text-lg font-medium mb-2" style={{ color: currentTheme.colors.textPrimary }}>
                New Conversation
              </h3>
              <p className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                Type your message below to begin chatting.
              </p>
            </div>
          </div>
        )}
        
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
      
      {/* New subtle scroll to bottom button with fade-in animation */}
      <div 
        className={`fixed bottom-24 right-4 z-50 transition-opacity duration-300 ease-in-out ${
          showScrollButton ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          className="flex items-center space-x-1 px-3 py-1.5 rounded-full shadow-md backdrop-blur-md transition-all transform hover:scale-105 active:scale-95"
          style={{
            backgroundColor: `${currentTheme.colors.bgSecondary}CC`,
            color: currentTheme.colors.textSecondary,
            border: `1px solid ${currentTheme.colors.borderColor}60`,
            boxShadow: `0 2px 8px rgba(0,0,0,0.15)`
          }}
          onClick={() => scrollToBottom(true)}
          aria-label="New messages"
        >
          <div className="relative">
            <div 
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse" 
              style={{ 
                backgroundColor: currentTheme.colors.accentPrimary,
                boxShadow: `0 0 6px ${currentTheme.colors.accentPrimary}`
              }}
            />
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
          <span className="text-xs font-medium whitespace-nowrap">New messages</span>
        </button>
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export default memo(ChatWindow, (prevProps, nextProps) => {
  // Only re-render if these props change
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.isGenerating !== nextProps.isGenerating) return false;
  
  // Check if messages array has changed
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  
  // More detailed comparison for messages themselves
  // First, check if any message IDs have changed
  const prevIds = prevProps.messages.map(msg => msg.id).join('|');
  const nextIds = nextProps.messages.map(msg => msg.id).join('|');
  if (prevIds !== nextIds) return false;
  
  // Then check if any content or status has changed
  for (let i = 0; i < prevProps.messages.length; i++) {
    const prevMsg = prevProps.messages[i];
    const nextMsg = nextProps.messages[i];
    
    if (prevMsg.content !== nextMsg.content) return false;
    if (prevMsg.status !== nextMsg.status) return false;
    
    // Compare sections if they exist
    if (prevMsg.sections && nextMsg.sections) {
      // Check response section
      if (prevMsg.sections.response?.content !== nextMsg.sections.response?.content) return false;
      
      // Check thinking section
      if (
        (prevMsg.sections.thinking?.content !== nextMsg.sections.thinking?.content) ||
        (prevMsg.sections.thinking?.visible !== nextMsg.sections.thinking?.visible)
      ) {
        return false;
      }
    }
    
    // If one has sections and the other doesn't, they're different
    if (Boolean(prevMsg.sections) !== Boolean(nextMsg.sections)) return false;
  }
  
  // Messages are the same, no need to re-render
  return true;
});