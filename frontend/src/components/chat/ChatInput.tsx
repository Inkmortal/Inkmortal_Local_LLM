import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const localInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Combine refs
  const combinedRef = inputRef || localInputRef;
  
  // Focus management function
  const forceFocus = useCallback(() => {
    if (combinedRef.current) {
      // Using direct DOM focus method
      combinedRef.current.focus();
    }
  }, [combinedRef]);

  // Set autofocus and handle initial focus
  useEffect(() => {
    // Initial focus on mount with a slight delay to ensure rendering is complete
    const timer = setTimeout(() => {
      forceFocus();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [forceFocus]);

  // Focus after sending a message
  const handleSend = useCallback(() => {
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
      
      // Focus using multiple timers with different delays to ensure it works
      // This combats various edge cases where focus might be lost
      requestAnimationFrame(() => {
        forceFocus();
        
        // Additional focus attempts with varying delays
        setTimeout(forceFocus, 0);
        setTimeout(forceFocus, 50);
        setTimeout(forceFocus, 100);
      });
    }
  }, [message, disabled, onSend, forceFocus]);

  // Handle Enter keypress
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Adjust textarea height based on content
  const adjustHeight = useCallback(() => {
    const element = combinedRef.current;
    if (!element) return;
    
    // Reset height to calculate proper scrollHeight
    element.style.height = 'auto';
    
    // Set to scrollHeight, but limit max height
    const maxHeight = 120; // Maximum height in pixels
    const newHeight = Math.min(element.scrollHeight, maxHeight);
    element.style.height = `${newHeight}px`;
    
    // Add scrollbar if content exceeds maxHeight
    element.style.overflowY = element.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [combinedRef]);

  // Adjust height when content changes
  useEffect(() => {
    adjustHeight();
  }, [message, adjustHeight]);

  // Force focus when window gains focus to improve usability
  useEffect(() => {
    const handleWindowFocus = () => {
      forceFocus();
    };
    
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [forceFocus]);

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
        <textarea
          ref={combinedRef as React.RefObject<HTMLTextAreaElement>}
          className="flex-grow py-3 px-4 outline-none resize-none min-h-[42px]"
          placeholder={placeholder}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyPress}
          disabled={disabled}
          rows={1}
          spellCheck={true}
          autoComplete="off"
          autoFocus={true}
          style={{
            backgroundColor: 'transparent',
            color: currentTheme.colors.textPrimary,
            overflowY: 'hidden',
          }}
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          variant="default"
          className="m-1.5 transition-all hover:scale-105 self-end mb-2 mr-2"
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