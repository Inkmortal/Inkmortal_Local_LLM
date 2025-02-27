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
  const [isFocused, setIsFocused] = useState(false);
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
      className={`flex items-end rounded-xl p-2 transition-all duration-300 ${isFocused ? 'ring-2' : 'border'}`}
      style={{ 
        backgroundColor: currentTheme.colors.bgSecondary,
        borderColor: `${currentTheme.colors.borderColor}70`,
        boxShadow: isFocused ? '0 0 0 2px rgba(255, 255, 255, 0.1)' : 'none',
        color: currentTheme.colors.textPrimary,
        ringColor: `${currentTheme.colors.accentPrimary}50`
      }}
    >
      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-grow resize-none bg-transparent outline-none p-3 min-h-[40px] modern-input"
        style={{ 
          color: currentTheme.colors.textPrimary,
          backgroundColor: 'transparent',
          border: 'none'
        }}
      />
      
      <Button
        onClick={handleSend}
        disabled={!message.trim() || disabled}
        className={`self-end ml-2 rounded-full transition-all duration-300 ${message.trim() && !disabled ? 'button-shimmer' : ''}`}
        style={{
          width: '40px',
          height: '40px',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 'unset',
          transform: message.trim() && !disabled ? 'scale(1.05)' : 'scale(1)'
        }}
        size="sm"
      >
        <svg 
          className={`w-5 h-5 transition-transform duration-300 ${message.trim() && !disabled ? 'scale-110' : 'scale-100'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
          />
        </svg>
      </Button>
    </div>
  );
};

export default ChatInput;