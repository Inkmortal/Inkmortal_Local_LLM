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
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Focus techniques to maintain focus during streaming responses
  useEffect(() => {
    // Log entire focus attempts for debugging
    console.log(`[ChatInput] Focus effect triggered: disabled=${disabled}, isGenerating=${isGenerating}`);
    
    if (!disabled && textareaRef.current) {
      // Immediate focus attempt
      textareaRef.current.focus();
      console.log("[ChatInput] Immediate focus attempt");
      
      // Delayed focus attempt with setTimeout (100ms)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          console.log("[ChatInput] 100ms delayed focus attempt");
        }
      }, 100);
      
      // Animation frame focus attempt
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          console.log("[ChatInput] requestAnimationFrame focus attempt");
        }
      });
      
      // 300ms delayed focus attempt
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          console.log("[ChatInput] 300ms delayed focus attempt");
        }
      }, 300);
    }
  }, [disabled, isGenerating]);
  
  // Additional focus interval during streaming
  useEffect(() => {
    let focusInterval: NodeJS.Timeout | null = null;
    
    // Only set up the interval if we're generating a response
    if (isGenerating) {
      console.log("[ChatInput] Setting up focus polling interval during streaming");
      focusInterval = setInterval(() => {
        if (textareaRef.current && document.activeElement !== textareaRef.current) {
          textareaRef.current.focus();
          console.log("[ChatInput] Focus refreshed during streaming");
        }
      }, 500);
    }
    
    return () => {
      if (focusInterval) {
        clearInterval(focusInterval);
        console.log("[ChatInput] Cleared focus polling interval");
      }
    };
  }, [isGenerating]);
  
  // Function to handle form submission
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
      
      // Attempt focus after sending
      if (textareaRef.current) {
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 10);
      }
    }
  }, [message, disabled, onSend]);

  // Handle Shift+Enter for newlines and Enter for submission
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Auto resize textarea as content changes
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  // Update message state and resize textarea
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setTimeout(adjustTextareaHeight, 0);
  }, [adjustTextareaHeight]);

  // Focus/blur handlers for styling
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  return (
    <div className="w-full">
      <form 
        onSubmit={handleSubmit}
        className="py-1 relative"
      >
        <div 
          className={`relative transition-all duration-200 rounded-2xl overflow-hidden ${
            isFocused 
              ? 'ring-2 ring-opacity-70' 
              : 'ring-1 ring-opacity-30'
          }`}
          style={{ 
            backgroundColor: currentTheme.colors.bgSecondary,
            boxShadow: isFocused 
              ? `0 0 0 2px ${currentTheme.colors.accentPrimary}40, 0 4px 16px rgba(0,0,0,0.1)` 
              : '0 2px 12px rgba(0,0,0,0.05)',
            ringColor: isFocused 
              ? currentTheme.colors.accentPrimary
              : currentTheme.colors.borderColor,
          }}
        >
          <textarea 
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className="w-full px-4 pt-3.5 pb-2 resize-none overflow-auto focus:outline-none"
            style={{ 
              backgroundColor: 'transparent',
              color: currentTheme.colors.textPrimary,
              caretColor: currentTheme.colors.accentPrimary,
              maxHeight: '200px',
            }}
          />
          
          <div className="px-3 pb-2.5 flex justify-between items-center">
            <div className="opacity-70" style={{ color: currentTheme.colors.textMuted }}>
              <div className="text-xs">
                Shift+Enter for new line
              </div>
            </div>
            
            <Button
              disabled={disabled || !message.trim()}
              type="submit"
              size="sm"
              className={`rounded-full px-4 py-1.5 transition-all ${
                !message.trim() ? 'opacity-50' : 'opacity-100 hover:brightness-110'
              }`}
              style={{ 
                background: message.trim() 
                  ? `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})` 
                  : `${currentTheme.colors.bgTertiary}`,
                color: message.trim() ? '#fff' : currentTheme.colors.textMuted,
                boxShadow: message.trim() ? '0 2px 10px rgba(0,0,0,0.15)' : 'none'
              }}
            >
              <div className="flex items-center text-sm font-medium">
                {isGenerating ? (
                  <>
                    <span className="mr-1.5">Generating</span>
                    <div className="flex space-x-1 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'currentColor' }}></div>
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse delay-150" style={{ background: 'currentColor', animationDelay: '0.15s' }}></div>
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse delay-300" style={{ background: 'currentColor', animationDelay: '0.3s' }}></div>
                    </div>
                  </>
                ) : (
                  <>
                    <span>Send</span>
                    <svg className="ml-1.5 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </div>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;