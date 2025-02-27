import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import MessageParser from './MessageParser';
import Button from '../ui/Button';

export interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  };
  onRegenerate?: () => void;
  onStopGeneration?: () => void;
  isGenerating?: boolean;
  isLastMessage?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  onRegenerate, 
  onStopGeneration,
  isGenerating = false,
  isLastMessage = false
}) => {
  const { currentTheme } = useTheme();
  const [showControls, setShowControls] = useState(false);
  const [hasAppeared, setHasAppeared] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isAssistant = message.role === 'assistant';
  
  // Animate in on mount
  useEffect(() => {
    // Short delay to ensure DOM is ready
    const timer = setTimeout(() => {
      setHasAppeared(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Intersection observer for scroll-based animations
  useEffect(() => {
    if (!messageRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('message-visible');
          }
        });
      },
      { threshold: 0.3 }
    );
    
    observer.observe(messageRef.current);
    
    return () => {
      if (messageRef.current) {
        observer.unobserve(messageRef.current);
      }
    };
  }, []);
  
  // Calculate time difference for timestamp display
  const getTimeDisplay = () => {
    const now = new Date();
    const diff = now.getTime() - message.timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div 
      ref={messageRef}
      className={`flex mb-6 ${isUser ? 'justify-end' : 'justify-start'} relative group 
        ${hasAppeared ? 'opacity-100' : 'opacity-0'} transition-opacity 
        ${isLastMessage ? 'last-message' : ''}`}
      style={{
        transitionDuration: '350ms'
      }}
      onMouseEnter={() => isAssistant && setShowControls(true)}
      onMouseLeave={() => isAssistant && setShowControls(false)}
    >
      {/* Timeline connection dot for assistant messages */}
      {isAssistant && (
        <div className="hidden md:block absolute left-4 top-5 w-2 h-2 rounded-full z-10"
          style={{ 
            background: `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
            boxShadow: `0 0 8px ${currentTheme.colors.accentPrimary}80`,
            transform: 'translateX(-50%)',
          }}
        />
      )}
      
      {/* Avatar for assistant */}
      {isAssistant && (
        <div className="w-9 h-9 rounded-full flex-shrink-0 mr-3 overflow-hidden relative shadow-lg">
          <div 
            className="absolute inset-0 bg-gradient-to-br opacity-90 z-0"
            style={{
              background: `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-white z-10">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 3.5V2M5.06 5.31L4 4.25M12 21.5V20M18.94 19.69L20 20.75M3.5 12H2M5.31 18.94L4.25 20M20.5 12H22M18.69 5.06L19.75 4" 
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 17.5C14.7614 17.5 17 15.2614 17 12.5C17 9.73858 14.7614 7.5 12 7.5C9.23858 7.5 7 9.73858 7 12.5C7 15.2614 9.23858 17.5 12 17.5Z" 
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          
          {/* Spinner effect during generation */}
          {isGenerating && (
            <div
              className="absolute inset-0 rounded-full z-20"
              style={{
                background: `conic-gradient(transparent, transparent, ${currentTheme.colors.accentPrimary})`,
                animation: 'spin 1.5s linear infinite',
              }}
            />
          )}
          
          {/* Inner border */}
          <div 
            className="absolute inset-[2px] rounded-full z-5" 
            style={{
              background: `radial-gradient(circle at 30% 30%, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`
            }}
          />
        </div>
      )}
      
      {/* Avatar for user */}
      {isUser && (
        <div className="w-9 h-9 rounded-full flex-shrink-0 ml-3 overflow-hidden relative shadow-lg order-2">
          <div 
            className="absolute inset-0 z-0"
            style={{
              backgroundColor: `${currentTheme.colors.accentPrimary}60`
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center z-10 font-medium text-white">
            {/* User initial avatar, could be personalized */}
            U
          </div>
        </div>
      )}
      
      <div 
        className={`${isUser ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-tl-md'} 
          px-5 py-4 max-w-[85%] md:max-w-[75%] relative overflow-hidden order-1 message-${isUser ? 'out' : 'in'}`}
        style={{ 
          backgroundColor: isSystem
            ? `${currentTheme.colors.accentSecondary}20`
            : isUser 
              ? currentTheme.colors.accentPrimary 
              : currentTheme.colors.bgSecondary,
          color: isUser 
            ? '#fff' 
            : currentTheme.colors.textPrimary,
          boxShadow: isAssistant 
            ? `0 8px 24px rgba(0, 0, 0, 0.09), 0 4px 8px rgba(0, 0, 0, 0.03)` 
            : isUser 
              ? `0 6px 16px ${currentTheme.colors.accentPrimary}20` 
              : `0 4px 12px rgba(0, 0, 0, 0.06)`,
          border: isAssistant ? `1px solid ${currentTheme.colors.borderColor}40` : 'none',
          transform: `translateY(${hasAppeared ? '0' : '20px'})`,
          transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease, opacity 0.3s ease',
        }}
      >
        {/* Decorative elements for assistant messages */}
        {isAssistant && (
          <>
            <div 
              className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
              style={{
                background: `linear-gradient(to right, ${currentTheme.colors.accentPrimary}70, ${currentTheme.colors.accentSecondary}70)`,
                opacity: 0.8
              }}
            />
            
            {/* Top-right glow spot */}
            <div
              className="absolute -right-5 -top-5 w-24 h-24 rounded-full opacity-5"
              style={{
                background: `radial-gradient(circle, ${currentTheme.colors.accentSecondary}, transparent 70%)`,
              }}
            />
            
            {/* Bottom-left glow spot */}
            <div
              className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full opacity-5"
              style={{
                background: `radial-gradient(circle, ${currentTheme.colors.accentPrimary}, transparent 70%)`,
              }}
            />
            
            {/* Subtle background dot pattern */}
            <div 
              className="absolute inset-0 opacity-3 pointer-events-none"
              style={{
                opacity: 0.03,
                backgroundImage: `radial-gradient(${currentTheme.colors.accentPrimary} 1px, transparent 1px)`,
                backgroundSize: '16px 16px'
              }}
            />
          </>
        )}
        
        {/* Decorative elements for user messages */}
        {isUser && (
          <>
            {/* Bottom-left glow */}
            <div
              className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full opacity-20"
              style={{
                background: `radial-gradient(circle, rgba(255,255,255,0.8), transparent 70%)`,
              }}
            />
            
            {/* Top-right corner accent */}
            <div
              className="absolute top-0 right-0 w-10 h-10 overflow-hidden"
            >
              <div 
                className="absolute top-0 right-0 w-5 h-5 rounded-full"
                style={{
                  boxShadow: `0 0 0 10px ${currentTheme.colors.accentSecondary}50`,
                  opacity: 0.3,
                  transform: 'translate(50%, -50%)'
                }}
              />
            </div>
          </>
        )}
        
        {/* System message decorations */}
        {isSystem && (
          <div className="absolute inset-0 overflow-hidden">
            <svg width="100%" height="100%" className="opacity-5">
              <defs>
                <pattern id="diagonalHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="10" stroke={currentTheme.colors.accentSecondary} strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#diagonalHatch)" />
            </svg>
          </div>
        )}
        
        {/* Message content */}
        <div className="whitespace-pre-wrap break-words relative z-10 message-content">
          {isUser ? (
            message.content
          ) : (
            <MessageParser content={message.content} />
          )}
        </div>
        
        {/* Message timestamp */}
        <div 
          className="text-xs mt-2 text-right opacity-70 flex justify-end items-center relative z-10"
          style={{ 
            color: isUser ? '#fff' : currentTheme.colors.textMuted 
          }}
        >
          {getTimeDisplay()}
        </div>
        
        {/* Regenerate/Stop Generation Controls with improved styling */}
        {isAssistant && (
          <div 
            className={`absolute -bottom-1 right-2 translate-y-full flex space-x-3 transition-all duration-300 ${
              (showControls || isGenerating) ? 'opacity-100 z-10 transform translateY-0' : 'opacity-0 z-0 transform -translate-y-1'
            } my-1`}
          >
            {isGenerating ? (
              <Button 
                size="sm" 
                variant="outline" 
                className="py-1.5 px-3 rounded-full backdrop-blur-sm flex items-center space-x-1.5 shadow-lg"
                onClick={onStopGeneration}
                style={{
                  backgroundColor: `${currentTheme.colors.error}15`,
                  borderColor: `${currentTheme.colors.error}60`,
                  color: currentTheme.colors.error,
                  boxShadow: `0 4px 12px ${currentTheme.colors.error}25`,
                  transform: 'translateY(0)',
                  transition: 'all 0.2s ease'
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Stop generating</span>
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline" 
                className="py-1.5 px-3 rounded-full backdrop-blur-sm transition-transform hover:scale-105 active:scale-95 shadow-lg"
                onClick={onRegenerate}
                style={{
                  backgroundColor: `${currentTheme.colors.accentPrimary}15`,
                  borderColor: `${currentTheme.colors.accentPrimary}40`,
                  color: currentTheme.colors.accentPrimary,
                  boxShadow: `0 4px 12px ${currentTheme.colors.accentPrimary}20`
                }}
              >
                <div className="flex items-center space-x-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Regenerate</span>
                </div>
              </Button>
            )}
            
            {/* Copy button */}
            <Button 
              size="sm" 
              variant="outline" 
              className="p-1.5 rounded-full backdrop-blur-sm transition-transform hover:scale-105 active:scale-95 shadow-lg"
              onClick={() => {
                navigator.clipboard.writeText(message.content);
                // In a real app, show a toast notification
              }}
              style={{
                backgroundColor: `${currentTheme.colors.bgTertiary}30`,
                borderColor: `${currentTheme.colors.borderColor}40`,
                color: currentTheme.colors.textSecondary,
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;