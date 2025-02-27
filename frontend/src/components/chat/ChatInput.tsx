import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  isGenerating?: boolean; // Add prop to know if response is streaming
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  disabled = false, 
  placeholder = "Type a message...",
  inputRef,
  isGenerating = false
}) => {
  const { currentTheme } = useTheme();
  const [message, setMessage] = useState<string>('');
  const localInputRef = useRef<HTMLTextAreaElement>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const focusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
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
  
  // Set up continuous focus attempts when generating response
  useEffect(() => {
    // When response generation ends, focus the textarea
    if (!isGenerating) {
      // Clear any existing interval
      if (focusIntervalRef.current) {
        clearInterval(focusIntervalRef.current);
        focusIntervalRef.current = null;
      }
      
      // Attempt focus after response completes
      const t1 = setTimeout(focusTextarea, 0);
      const t2 = setTimeout(focusTextarea, 100);
      const t3 = setTimeout(focusTextarea, 300);
      
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      // During streaming, set up polling to keep attempting focus
      focusIntervalRef.current = setInterval(focusTextarea, 500);
      
      return () => {
        if (focusIntervalRef.current) {
          clearInterval(focusIntervalRef.current);
          focusIntervalRef.current = null;
        }
      };
    }
  }, [isGenerating, focusTextarea]);
  
  // Handle form submission
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (message.trim() && !disabled) {
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
      handleSubmit();
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
  }, [handleSubmit, message, textareaRef]);

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
    
    const container = formRef.current;
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
      if (focusIntervalRef.current) {
        clearInterval(focusIntervalRef.current);
      }
    };
  }, [focusTextarea]);

  return (
    <div className="relative w-full" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Form wrapper to match Claude.ai interface */}
      <form 
        ref={formRef}
        onSubmit={handleSubmit}
        className="relative"
      >
        {/* Loading indicator - matches Claude.ai style */}
        {isGenerating && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full">
            <div className="text-xs opacity-60 bg-opacity-80 px-2 py-1 rounded-t-md" style={{ 
              color: currentTheme.colors.textSecondary, 
              backgroundColor: `${currentTheme.colors.bgSecondary}80` 
            }}>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span>AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Main input container - matches Claude.ai style */}
        <div className="flex flex-col">
          <div 
            className="border rounded-lg overflow-hidden transition-all bg-opacity-90"
            style={{ 
              borderColor: `${currentTheme.colors.borderColor}80`,
              backgroundColor: currentTheme.colors.bgSecondary,
              boxShadow: `0 2px 6px rgba(0, 0, 0, 0.1)`,
            }}
          >
            {/* Textarea wrapper */}
            <div className="flex items-center px-3 py-2">
              <textarea
                ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
                className="flex-grow outline-none resize-none min-h-[24px] bg-transparent placeholder-opacity-60 mx-1"
                placeholder={placeholder}
                value={message}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={(e) => {
                  // Only refocus if not clicking on a button
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
                  color: currentTheme.colors.textPrimary,
                  overflowY: 'hidden',
                  fontFamily: "'SF Pro Text', system-ui, sans-serif",
                  fontSize: '0.95rem',
                  lineHeight: '1.5',
                }}
              />
            </div>
            
            {/* Button bar - matches Claude.ai style */}
            <div 
              className="flex items-center justify-between px-3 py-2 border-t"
              style={{ 
                borderColor: `${currentTheme.colors.borderColor}40`
              }}
            >
              <div className="text-xs opacity-70" style={{ color: currentTheme.colors.textSecondary }}>
                <span>Press Enter to send, Shift+Enter for new line</span>
              </div>
              
              <button
                type="submit"
                disabled={disabled || !message.trim()}
                className="px-4 py-1 rounded-md text-sm font-medium transition-all"
                style={{
                  backgroundColor: message.trim() && !disabled
                    ? currentTheme.colors.accentPrimary
                    : `${currentTheme.colors.bgTertiary}80`,
                  color: message.trim() && !disabled
                    ? '#fff'
                    : currentTheme.colors.textMuted,
                  opacity: disabled ? 0.5 : 1,
                  cursor: message.trim() && !disabled ? 'pointer' : 'default'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;