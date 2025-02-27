import React, { useState } from 'react';
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
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  onRegenerate, 
  onStopGeneration,
  isGenerating = false
}) => {
  const { currentTheme } = useTheme();
  const [showControls, setShowControls] = useState(false);
  
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isAssistant = message.role === 'assistant';
  
  return (
    <div 
      className={`flex mb-6 ${isUser ? 'justify-end' : 'justify-start'} relative group`}
      onMouseEnter={() => isAssistant && setShowControls(true)}
      onMouseLeave={() => isAssistant && setShowControls(false)}
    >
      {/* Avatar for assistant */}
      {isAssistant && (
        <div className="w-8 h-8 rounded-full flex-shrink-0 mr-2 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-90"></div>
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 3.5V2M5.06 5.31L4 4.25M12 21.5V20M18.94 19.69L20 20.75M3.5 12H2M5.31 18.94L4.25 20M20.5 12H22M18.69 5.06L19.75 4" 
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 17.5C14.7614 17.5 17 15.2614 17 12.5C17 9.73858 14.7614 7.5 12 7.5C9.23858 7.5 7 9.73858 7 12.5C7 15.2614 9.23858 17.5 12 17.5Z" 
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}
      
      <div 
        className={`${isUser ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-tl-md'} 
          px-5 py-3 max-w-[85%] md:max-w-[75%] relative overflow-hidden`}
        style={{ 
          backgroundColor: isSystem
            ? `${currentTheme.colors.accentSecondary}30`
            : isUser 
              ? currentTheme.colors.accentPrimary 
              : currentTheme.colors.bgSecondary,
          color: isUser 
            ? '#fff' 
            : currentTheme.colors.textPrimary,
          boxShadow: isAssistant 
            ? `0 4px 12px rgba(0, 0, 0, 0.08)` 
            : isUser 
              ? `0 2px 8px ${currentTheme.colors.accentPrimary}20` 
              : `0 2px 10px rgba(0, 0, 0, 0.05)`,
          border: isAssistant ? `1px solid ${currentTheme.colors.borderColor}40` : 'none'
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
            <div
              className="absolute -right-5 -bottom-5 w-24 h-24 rounded-full opacity-5"
              style={{
                background: `radial-gradient(circle, ${currentTheme.colors.accentPrimary}, transparent 70%)`,
              }}
            />
          </>
        )}
        
        <div className="whitespace-pre-wrap break-words relative z-10">
          {isUser ? (
            message.content
          ) : (
            <MessageParser content={message.content} />
          )}
        </div>
        
        <div 
          className="text-xs mt-2 text-right opacity-70 flex justify-end items-center relative z-10"
          style={{ 
            color: isUser ? '#fff' : currentTheme.colors.textMuted 
          }}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        
        {/* Regenerate/Stop Generation Controls - Added directly to message for better positioning */}
        {isAssistant && (
          <div 
            className={`absolute -bottom-1 right-2 translate-y-full flex space-x-2 transition-opacity duration-200 ${
              (showControls || isGenerating) ? 'opacity-100 z-10' : 'opacity-0 z-0'
            } my-1`}
          >
            {isGenerating ? (
              <Button 
                size="sm" 
                variant="outline" 
                className="py-1 px-2"
                onClick={onStopGeneration}
                style={{
                  backgroundColor: `${currentTheme.colors.error}20`,
                  borderColor: currentTheme.colors.error,
                  color: currentTheme.colors.error,
                  boxShadow: `0 2px 8px ${currentTheme.colors.error}30`
                }}
              >
                <div className="flex items-center">
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Stop generating
                </div>
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline" 
                className="py-1 px-2"
                onClick={onRegenerate}
                style={{
                  backgroundColor: `${currentTheme.colors.accentPrimary}10`,
                  borderColor: currentTheme.colors.accentPrimary,
                  color: currentTheme.colors.accentPrimary
                }}
              >
                <div className="flex items-center">
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate
                </div>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;