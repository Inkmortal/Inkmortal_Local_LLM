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
  
  // Use local ref if no ref is provided
  const combinedRef = inputRef as React.RefObject<HTMLTextAreaElement> || localInputRef;
  
  // Focus input on first render
  useEffect(() => {
    const focusInput = () => {
      if (combinedRef.current) {
        combinedRef.current.focus();
      }
    };
    
    // Multiple focus attempts with staggered timing
    focusInput();
    setTimeout(focusInput, 0);
    setTimeout(focusInput, 100);
  }, [combinedRef]);
  
  // Handle message sending and maintain focus
  const handleSend = useCallback(() => {
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
      
      // Force focus back on textarea after sending
      requestAnimationFrame(() => {
        if (combinedRef.current) {
          combinedRef.current.focus();
          combinedRef.current.style.height = '48px';
        }
      });
    }
  }, [message, disabled, onSend, combinedRef]);

  // Handle Enter key for sending, Shift+Enter for new line
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      const textarea = combinedRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newMessage = message.substring(0, start) + '\n' + message.substring(end);
        setMessage(newMessage);
        
        // Set cursor position after inserted newline
        setTimeout(() => {
          if (textarea) {
            textarea.selectionStart = start + 1;
            textarea.selectionEnd = start + 1;
          }
        }, 0);
      }
    }
  }, [handleSend, message, combinedRef]);

  // Handle textarea height adjustment
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const textarea = combinedRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 48)}px`;
      textarea.style.overflowY = textarea.scrollHeight > 200 ? 'auto' : 'hidden';
    }
  }, [combinedRef]);

  // Reset focus when window regains focus
  useEffect(() => {
    const handleWindowFocus = () => {
      if (combinedRef.current) {
        combinedRef.current.focus();
      }
    };
    
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [combinedRef]);

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
          onChange={handleChange}
          onKeyDown={handleKeyDown}
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