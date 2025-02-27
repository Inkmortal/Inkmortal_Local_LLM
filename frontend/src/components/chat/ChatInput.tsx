import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  disabled = false, 
  placeholder = "Type a message...",
  inputRef
}) => {
  const { currentTheme } = useTheme();
  const [message, setMessage] = useState<string>('');
  const localInputRef = useRef<HTMLInputElement>(null);
  
  // Combine refs
  const combinedRef = inputRef || localInputRef;
  
  // Auto-focus the input field when the component mounts or updates
  useEffect(() => {
    // Focus immediately on mount
    if (combinedRef.current) {
      combinedRef.current.focus();
    }
  }, []);

  // Re-focus after sending to ensure focus is maintained
  useEffect(() => {
    const focusInput = () => {
      if (combinedRef.current) {
        combinedRef.current.focus();
      }
    };
    
    // Set up an interval to try to focus the input
    // This helps ensure focus even if other elements try to take focus
    const focusInterval = setInterval(focusInput, 100);
    
    // Clear the interval after a short time
    setTimeout(() => {
      clearInterval(focusInterval);
    }, 500);
    
    return () => {
      clearInterval(focusInterval);
    };
  }, [message]); // This will re-run when message changes (like after sending)

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
      // Attempt immediate refocus
      setTimeout(() => {
        if (combinedRef.current) {
          combinedRef.current.focus();
        }
      }, 10);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative">
      <div 
        className="flex items-center rounded-xl overflow-hidden transition-all hover:shadow-md"
        style={{ 
          border: `1px solid ${currentTheme.colors.borderColor}80`,
          backgroundColor: currentTheme.colors.bgPrimary,
          boxShadow: `0 2px 8px rgba(0, 0, 0, 0.05)` 
        }}
      >
        <input
          ref={combinedRef}
          type="text"
          className="flex-grow py-3 px-4 outline-none"
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          autoFocus={true}
          style={{
            backgroundColor: 'transparent',
            color: currentTheme.colors.textPrimary,
          }}
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          variant="default"
          className="m-1.5 transition-all hover:scale-105"
          style={{
            background: message.trim() 
              ? `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})` 
              : currentTheme.colors.bgTertiary,
            color: message.trim() ? '#fff' : currentTheme.colors.textMuted,
            opacity: disabled || !message.trim() ? 0.6 : 1,
            padding: '0.6rem 1.2rem',
            borderRadius: '10px',
            boxShadow: message.trim() ? `0 2px 10px ${currentTheme.colors.accentPrimary}40` : 'none',
          }}
        >
          <span className="flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;