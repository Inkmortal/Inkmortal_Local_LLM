import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import MessageParser from './MessageParser';

export interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  };
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { currentTheme } = useTheme();
  
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  return (
    <div 
      className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div 
        className={`rounded-lg px-4 py-2 max-w-[80%] ${
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
        }}
      >
        <div className="whitespace-pre-wrap break-words">
          {isUser ? (
            message.content
          ) : (
            <MessageParser content={message.content} />
          )}
        </div>
        <div 
          className="text-xs mt-1 text-right opacity-70"
          style={{ 
            color: isUser ? '#fff' : currentTheme.colors.textMuted 
          }}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;