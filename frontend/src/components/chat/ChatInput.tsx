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
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use local ref if no ref is provided
  const textareaRef = inputRef as React.RefObject<HTMLTextAreaElement> || localInputRef;
  
  // Helper function to force focus with console feedback
  const focusTextarea = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      console.log('Focus attempt on textarea');
    } else {
      console.warn('Textarea ref is null during focus attempt');
    }
  }, [textareaRef]);

  // Focus input on component mount
  useEffect(() => {
    // Immediate focus
    focusTextarea();
    
    // Backup focus with staggered timing
    const t1 = setTimeout(focusTextarea, 0);
    const t2 = setTimeout(focusTextarea, 50);
    const t3 = setTimeout(focusTextarea, 100);
    
    // Cleanup timeouts
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [focusTextarea]);
  
  // Handle message sending
  const handleSend = useCallback(() => {
    if (message.trim() && !disabled) {
      // Store current selection state and height
      const selectionStart = textareaRef.current?.selectionStart || 0;
      
      // Send message
      onSend(message);
      
      // Reset state
      setMessage('');
      
      // Focus management cascade (multiple approaches for redundancy)
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      
      // First attempt: immediate
      focusTextarea();
      
      // Second attempt: requestAnimationFrame
      requestAnimationFrame(() => {
        focusTextarea();
        
        // Third attempt: setTimeout series
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.style.height = '48px';
          }
        }, 0);
        
        focusTimeoutRef.current = setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            // Place cursor at beginning
            textareaRef.current.selectionStart = 0;
            textareaRef.current.selectionEnd = 0;
          }
        }, 100);
      });
    }
  }, [message, disabled, onSend, focusTextarea, textareaRef]);

  // Handle Enter key for sending, Shift+Enter for new line
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      const textarea = textareaRef.current;
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
            // Force focus during cursor position change
            textarea.focus();
          }
        }, 0);
      }
    }
  }, [handleSend, message, textareaRef]);

  // Handle textarea height adjustment
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 48)}px`;
      textarea.style.overflowY = textarea.scrollHeight > 200 ? 'auto' : 'hidden';
    }
  }, [textareaRef]);

  // Reset focus when window regains focus
  useEffect(() => {
    const handleWindowFocus = () => {
      focusTextarea();
    };
    
    // Focus on blur events within the container to prevent focus loss
    const handleContainerBlur = (e: FocusEvent) => {
      // If focus is moving outside container, recover it
      if (!e.currentTarget || !e.relatedTarget || 
          !(e.currentTarget as Node).contains(e.relatedTarget as Node)) {
        setTimeout(focusTextarea, 0);
      }
    };
    
    const container = textareaRef.current?.parentElement?.parentElement;
    if (container) {
      container.addEventListener('focusout', handleContainerBlur);
    }
    
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      if (container) {
        container.removeEventListener('focusout', handleContainerBlur);
      }
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, [focusTextarea, textareaRef]);

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
          ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
          className="flex-grow py-3 px-4 outline-none resize-none min-h-[42px]"
          placeholder={placeholder}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            // If blur is not moving to send button, refocus
            if (!e.relatedTarget || e.relatedTarget.tagName !== 'BUTTON') {
              setTimeout(focusTextarea, 0);
            }
          }}
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
          onClick={(e) => {
            e.preventDefault();
            handleSend();
            // Focus management from button click
            setTimeout(focusTextarea, 0);
          }}
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