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
    <div className="relative w-full mx-auto px-4 pb-4 z-10">
      {/* Streaming indicator above input */}
      {isGenerating && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs animate-pulse"
            style={{ 
              background: `linear-gradient(135deg, ${currentTheme.colors.bgSecondary}95, ${currentTheme.colors.bgTertiary}95)`,
              border: `1px solid ${currentTheme.colors.borderColor}40`,
              backdropFilter: 'blur(8px)',
              boxShadow: `0 2px 12px ${currentTheme.colors.accentPrimary}30`,
              color: currentTheme.colors.textSecondary,
            }}
          >
            <div className="relative flex h-2 w-2">
              <span 
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" 
                style={{ backgroundColor: currentTheme.colors.accentPrimary }}
              />
              <span 
                className="relative inline-flex rounded-full h-2 w-2" 
                style={{ backgroundColor: currentTheme.colors.accentPrimary }}
              />
            </div>
            AI is generating a response...
          </div>
        </div>
      )}
      
      {/* Form wrapper with bottom cloud effect */}
      <form 
        ref={formRef}
        onSubmit={handleSubmit}
        className="relative"
        style={{ 
          filter: isGenerating ? 'none' : 'drop-shadow(0 -2px 10px rgba(0,0,0,0.1))',
        }}
      >
        {/* Beautiful frosted glass input container */}
        <div 
          className="relative rounded-xl overflow-hidden border transition-all"
          style={{ 
            borderColor: isGenerating 
              ? `${currentTheme.colors.accentSecondary}60`
              : `${currentTheme.colors.borderColor}60`,
            background: `linear-gradient(135deg, ${currentTheme.colors.bgSecondary}90, ${currentTheme.colors.bgPrimary}90)`,
            backdropFilter: 'blur(10px)',
            boxShadow: isGenerating
              ? `0 0 0 1px ${currentTheme.colors.accentSecondary}40, 0 2px 20px ${currentTheme.colors.accentSecondary}20`
              : `0 0 0 1px ${currentTheme.colors.borderColor}20, 0 2px 12px rgba(0,0,0,0.04)`,
            transition: 'all 0.3s ease',
          }}
        >
          {/* Glowing border effect when streaming */}
          {isGenerating && (
            <div 
              className="absolute inset-0 pointer-events-none" 
              style={{
                background: 'transparent',
                boxShadow: `0 0 8px ${currentTheme.colors.accentPrimary}50, 0 0 20px ${currentTheme.colors.accentSecondary}20 inset`,
                borderRadius: 'inherit',
                opacity: 0.7,
                animation: 'pulse 2s infinite ease-in-out'
              }}
            />
          )}
          
          {/* Progress indicator */}
          {isGenerating && (
            <div 
              className="absolute top-0 left-0 h-0.5 w-full"
              style={{
                background: `linear-gradient(to right, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
                animation: 'indeterminateProgress 2s ease infinite',
                opacity: 0.8,
              }}
            />
          )}
          
          {/* Main input container */}
          <div className="flex flex-col">
            {/* Textarea wrapper with natural padding */}
            <div className="px-4 pt-3 pb-2">
              <textarea
                ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
                className="w-full outline-none resize-none min-h-[24px] bg-transparent text-base"
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
                  fontFamily: "'Inter', system-ui, sans-serif",
                  lineHeight: '1.5',
                }}
              />
            </div>
            
            {/* Input actions bar with gradient separator */}
            <div 
              className="flex items-center justify-between py-2 px-3 border-t"
              style={{
                borderColor: `${currentTheme.colors.borderColor}30`,
                background: `linear-gradient(to bottom, ${currentTheme.colors.bgSecondary}40, ${currentTheme.colors.bgTertiary}20)`,
              }}
            >
              {/* Input features and shortcuts */}
              <div className="flex items-center gap-1.5 text-xs" style={{ color: currentTheme.colors.textSecondary }}>
                <button
                  type="button"
                  className="opacity-60 hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-black hover:bg-opacity-5 focus:outline-none"
                  onClick={() => {/* File upload logic */}}
                  title="Attach file"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                
                <div className="text-xs opacity-70 select-none">
                  <span>⏎ to send</span>
                  <span className="mx-1.5 opacity-40">•</span>
                  <span>Shift+⏎ for line break</span>
                </div>
              </div>
              
              {/* Dynamic send button */}
              <div className="flex items-center">
                {message.trim() && (
                  <button
                    type="button"
                    className="mr-2 opacity-60 hover:opacity-100 transition-opacity p-1 rounded hover:bg-black hover:bg-opacity-5"
                    onClick={() => {
                      setMessage('');
                      if (textareaRef.current) {
                        textareaRef.current.style.height = '48px';
                        textareaRef.current.focus();
                      }
                    }}
                    title="Clear message"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={disabled || !message.trim()}
                  className="relative group overflow-hidden rounded-md transition-all p-0.5"
                  style={{
                    opacity: disabled || !message.trim() ? 0.5 : 1,
                    background: message.trim() && !disabled
                      ? `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`
                      : 'transparent',
                    border: message.trim() && !disabled ? 'none' : `1px solid ${currentTheme.colors.borderColor}40`,
                  }}
                >
                  {/* Beautiful gradient inner effect */}
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
                    style={{
                      background: message.trim() && !disabled 
                        ? `radial-gradient(circle at center, ${currentTheme.colors.accentSecondary}90, transparent 70%)`
                        : 'none',
                    }}
                  />
                  
                  {/* Button content */}
                  <span 
                    className="flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-[3px] transition-colors"
                    style={{
                      color: message.trim() && !disabled ? '#fff' : currentTheme.colors.textSecondary,
                      background: message.trim() && !disabled ? 'transparent' : 'transparent',
                    }}
                  >
                    <span className="mr-1.5">Send</span>
                    <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
      
      {/* Add keyframe animation */}
      <style jsx>{`
        @keyframes indeterminateProgress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 0.8; }
          100% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default ChatInput;