import React, { useRef, useEffect } from 'react';
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div 
      className="flex-grow overflow-y-auto p-4 modern-scrollbar"
      style={{ 
        backgroundColor: currentTheme.colors.bgPrimary,
        backgroundImage: `radial-gradient(circle at 50% 50%, ${currentTheme.colors.bgPrimary}30, ${currentTheme.colors.bgPrimary})` 
      }}
    >
      <div className="max-w-4xl mx-auto">
        {messages.map((message, index) => (
          <ChatMessage 
            key={message.id} 
            message={message}
            onRegenerate={onRegenerate ? () => onRegenerate(message.id) : undefined}
            onStopGeneration={onStopGeneration}
            isGenerating={isGenerating && index === messages.length - 1 && message.role === 'assistant'}
          />
        ))}
        
        {loading && (
          <div className="flex justify-start mb-4 message-fade-in">
            <div 
              className="rounded-lg px-4 py-3 max-w-[80%] rounded-tl-none"
              style={{ 
                backgroundColor: currentTheme.colors.bgSecondary,
                color: currentTheme.colors.textPrimary,
                border: `1px solid ${currentTheme.colors.borderColor}50`,
                boxShadow: `0 3px 12px rgba(0,0,0,0.1)`,
              }}
            >
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full animate-bounce" 
                  style={{ 
                    backgroundColor: currentTheme.colors.accentPrimary, 
                    animationDelay: '0ms',
                    boxShadow: `0 0 10px ${currentTheme.colors.accentPrimary}80`
                  }}
                ></div>
                <div className="w-2 h-2 rounded-full animate-bounce" 
                  style={{ 
                    backgroundColor: currentTheme.colors.accentSecondary, 
                    animationDelay: '150ms',
                    boxShadow: `0 0 10px ${currentTheme.colors.accentSecondary}80`
                  }}
                ></div>
                <div className="w-2 h-2 rounded-full animate-bounce" 
                  style={{ 
                    backgroundColor: currentTheme.colors.accentTertiary, 
                    animationDelay: '300ms',
                    boxShadow: `0 0 10px ${currentTheme.colors.accentTertiary}80`
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatWindow;