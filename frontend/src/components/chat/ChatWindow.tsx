import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import ChatMessage, { ChatMessageProps } from './ChatMessage';

interface ChatWindowProps {
  messages: ChatMessageProps['message'][];
  loading?: boolean;
  onRegenerate?: (messageId: string) => void;
  onStopGeneration?: () => void;
  isGenerating?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  messages, 
  loading = false,
  onRegenerate,
  onStopGeneration,
  isGenerating = false
}) => {
  const { currentTheme } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrolledUp, setScrolledUp] = useState(false);
  const [newMessages, setNewMessages] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const scrollRAFRef = useRef<number | null>(null);

  // Enhanced scroll behavior with request animation frame
  const scrollToBottom = useCallback((force = false) => {
    if (messagesEndRef.current && (!scrolledUp || force)) {
      // Use RAF for smoother scrolling
      if (scrollRAFRef.current) {
        window.cancelAnimationFrame(scrollRAFRef.current);
      }
      
      scrollRAFRef.current = window.requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end' 
        });
        
        scrollRAFRef.current = null;
        if (newMessages) setNewMessages(false);
      });
    }
  }, [scrolledUp, newMessages]);

  // Debounced scroll handler to optimize performance
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    // Clear existing timeout to debounce rapid scroll events
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    
    // Debounce scroll events to reduce processing
    scrollTimeoutRef.current = window.setTimeout(() => {
      // Use requestAnimationFrame to align with browser render cycle
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

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = window.setTimeout(() => {
        scrollToBottom();
        scrollTimeoutRef.current = null;
      }, 100);
    }
    
    // Clean up on unmount
    return () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
      if (scrollRAFRef.current) {
        window.cancelAnimationFrame(scrollRAFRef.current);
      }
    };
  }, [messages, scrollToBottom]);

  // Set new messages flag when scrolled up
  useEffect(() => {
    if (scrolledUp && messages.length > 0) {
      setNewMessages(true);
    }
  }, [messages, scrolledUp]);

  // Calculate dynamic background gradient (memoized to prevent recalculation)
  const backgroundGradients = useCallback(() => {
    // Extract colors without alpha calculations on every render
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
  }, [currentTheme.colors.accentPrimary, currentTheme.colors.accentSecondary, currentTheme.colors.bgPrimary]);

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
        {/* Message timeline decoration */}
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
        
        {messages.map((message, index) => (
          <ChatMessage 
            key={message.id} 
            message={message}
            onRegenerate={onRegenerate ? () => onRegenerate(message.id) : undefined}
            onStopGeneration={onStopGeneration}
            isGenerating={isGenerating && index === messages.length - 1 && message.role === 'assistant'}
            isLastMessage={index === messages.length - 1}
          />
        ))}
        
        {loading && (
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

// Apply more strict memoization with custom comparison function to reduce re-renders
export default React.memo(ChatWindow, (prevProps, nextProps) => {
  // Only re-render when these specific props change
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (prevProps.loading !== nextProps.loading) return false;
  if (prevProps.isGenerating !== nextProps.isGenerating) return false;
  
  // For messages, only check the last message if length is the same (most common case during streaming)
  if (prevProps.messages.length > 0 && nextProps.messages.length > 0) {
    const prevLastMsg = prevProps.messages[prevProps.messages.length - 1];
    const nextLastMsg = nextProps.messages[nextProps.messages.length - 1];
    
    if (prevLastMsg.id !== nextLastMsg.id) return false;
    if (prevLastMsg.status !== nextLastMsg.status) return false;
    if (prevLastMsg.content !== nextLastMsg.content) return false;
  }
  
  return true;
});