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
      className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => isAssistant && setShowControls(true)}
      onMouseLeave={() => isAssistant && setShowControls(false)}
    >
      <div 
        className={`rounded-lg px-4 py-2 max-w-[80%] relative ${
          isUser 
            ? 'rounded-tr-none' 
            : 'rounded-tl-none'
        }`}
        style={{ 
          backgroundColor: isSystem
            ? `${currentTheme.colors.accentSecondary}30`
            : isUser 
              ? currentTheme.colors.accentPrimary 
              : currentTheme.colors.bgSecondary,
          color: isUser 
            ? '#fff' 
            : currentTheme.colors.textPrimary,
          boxShadow: `0 2px 10px rgba(0, 0, 0, 0.05)`,
          border: isAssistant ? `1px solid ${currentTheme.colors.borderColor}40` : 'none'
        }}
      >
        {/* Subtle accent top border for assistant messages */}
        {isAssistant && (
          <div 
            className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg"
            style={{
              background: `linear-gradient(to right, ${currentTheme.colors.accentPrimary}70, ${currentTheme.colors.accentSecondary}70)`,
              opacity: 0.8
            }}
          />
        )}
        
        <div className="whitespace-pre-wrap break-words">
          {isUser ? (
            message.content
          ) : (
            <MessageParser content={message.content} />
          )}
        </div>
        
        <div 
          className="text-xs mt-2 text-right opacity-70 flex justify-end items-center"
          style={{ 
            color: isUser ? '#fff' : currentTheme.colors.textMuted 
          }}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        
        {/* Regenerate/Stop Generation Controls */}
        {isAssistant && (showControls || isGenerating) && (
          <div 
            className="absolute -bottom-10 right-0 flex space-x-2 transition-opacity duration-200"
            style={{ opacity: showControls || isGenerating ? 1 : 0 }}
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