import React, { useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import ChatMessage, { ChatMessageProps } from './ChatMessage';

interface ChatWindowProps {
  messages: ChatMessageProps['message'][];
  loading?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, loading = false }) => {
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
      className="flex-grow overflow-y-auto p-4"
      style={{ backgroundColor: currentTheme.colors.bgPrimary }}
    >
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      
      {loading && (
        <div className="flex justify-start mb-4">
          <div 
            className="rounded-lg rounded-tl-none px-4 py-2 max-w-[80%]"
            style={{ 
              backgroundColor: currentTheme.colors.bgSecondary,
              color: currentTheme.colors.textPrimary
            }}
          >
            <div className="flex space-x-2">
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: currentTheme.colors.accentPrimary, animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: currentTheme.colors.accentPrimary, animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: currentTheme.colors.accentPrimary, animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow;