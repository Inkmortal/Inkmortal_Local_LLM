import React, { useState, ChangeEvent, KeyboardEvent, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  placeholder = 'Type your message...',
  disabled = false
}) => {
  const { currentTheme } = useTheme();
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  return (
    <div 
      className="flex items-end border rounded-lg p-2 focus-within:ring-2"
      style={{ 
        backgroundColor: currentTheme.colors.bgSecondary,
        borderColor: currentTheme.colors.borderColor,
        color: currentTheme.colors.textPrimary 
      }}
    >
      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-grow resize-none bg-transparent outline-none p-2 min-h-[40px]"
        style={{ 
          color: currentTheme.colors.textPrimary 
        }}
      />
      <Button
        onClick={handleSend}
        disabled={!message.trim() || disabled}
        className="self-end ml-2"
        size="sm"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </Button>
    </div>
  );
};

export default ChatInput;