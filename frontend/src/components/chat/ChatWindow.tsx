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
  
  // User scroll state
  const [scrolledUp, setScrolledUp] = useState(false);
  const [newMessages, setNewMessages] = useState(false);
  
  // Animation frame and timeout refs for performance
  const scrollTimeoutRef = useRef<number | null>(null);
  const scrollRAFRef = useRef<number | null>(null);
  const lastScrollHeightRef = useRef<number>(0);
  
  // Scroll to bottom with animation frame for better performance
  const scrollToBottom = useCallback((force = false) => {
    // Don't scroll if we're scrolled up and not forcing
    if (!messagesEndRef.current || (scrolledUp && !force)) {
      return;
    }
    
    // Cancel any pending animation frame
    if (scrollRAFRef.current) {
      window.cancelAnimationFrame(scrollRAFRef.current);
      scrollRAFRef.current = null;
    }
    
    // Create a new animation frame request
    scrollRAFRef.current = window.requestAnimationFrame(() => {
      // Check if element still exists before scrolling
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end' 
        });
      }
      
      // Clear the animation frame reference
      scrollRAFRef.current = null;
      
      // Clear new messages flag
      if (newMessages) {
        setNewMessages(false);
      }
    });
  }, [scrolledUp, newMessages]);
  
  // Debounced scroll handler with optimized performance
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    // Clear existing timeout to debounce rapid scroll events
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    
    // Debounce scroll events
    scrollTimeoutRef.current = window.setTimeout(() => {
      scrollRAFRef.current = window.requestAnimationFrame(() => {
        if (!containerRef.current) return;
        
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const isScrolledToBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50;
        
        setScrolledUp(!isScrolledToBottom);
        scrollRAFRef.current = null;
        scrollTimeoutRef.current = null;
      });
    }, 100);
  }, []);
  
  // Scroll to bottom when messages array or content changes
  useEffect(() => {
    if (!containerRef.current || messages.length === 0) return;
    
    // Compare current scroll height with previous
    const currentScrollHeight = containerRef.current.scrollHeight;
    const scrollHeightChanged = currentScrollHeight !== lastScrollHeightRef.current;
    
    // Only auto-scroll if content height changed
    if (scrollHeightChanged) {
      lastScrollHeightRef.current = currentScrollHeight;
      
      // Cancel previous scroll timeout if any
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
      
      // Delay scrolling slightly to ensure all DOM updates are processed
      scrollTimeoutRef.current = window.setTimeout(() => {
        scrollToBottom();
        scrollTimeoutRef.current = null;
      }, 100);
    }
    
    // Clean up on unmount
    return () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      if (scrollRAFRef.current) {
        window.cancelAnimationFrame(scrollRAFRef.current);
        scrollRAFRef.current = null;
      }
    };
  }, [messages, scrollToBottom]);
  
  // Set new messages flag when scrolled up and new messages arrive
  useEffect(() => {
    if (scrolledUp && messages.length > 0) {
      setNewMessages(true);
    }
  }, [messages, scrolledUp]);
  
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
      
      {/* New messages indicator when scrolled up */}
      {newMessages && scrolledUp && (
        <button
          className="absolute bottom-4 right-4 z-10 py-2 px-4 rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center animate-bounce"
          style={{
            background: `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
            color: '#fff',
            border: `1px solid ${currentTheme.colors.accentPrimary}80`,
            boxShadow: `0 4px 12px ${currentTheme.colors.accentPrimary}40`
          }}
          onClick={() => scrollToBottom(true)}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <span className="text-sm font-medium">New messages</span>
        </button>
      )}
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