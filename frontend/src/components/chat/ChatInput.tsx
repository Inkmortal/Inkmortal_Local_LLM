import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onInsertCode?: (codeSnippet: string) => void; // Add prop for inserting code
  onInsertMath?: (mathSnippet: string) => void; // Add prop for inserting math
  isGenerating?: boolean; // Add prop to know if response is streaming
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  disabled = false, 
  placeholder = "Type a message...",
  inputRef,
  isGenerating = false,
  onInsertCode,
  onInsertMath
}) => {
  const { currentTheme } = useTheme();
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{top: number, left: number} | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track if user is actively typing for advanced effects
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Focus techniques to maintain focus during streaming responses
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      // Try multiple focus approaches for better reliability
      textareaRef.current.focus();
      
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      });
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 300);
    }
  }, [disabled, isGenerating]);
  
  // Additional focus interval during streaming
  useEffect(() => {
    let focusInterval: NodeJS.Timeout | null = null;
    
    // Only set up the interval if we're generating a response
    if (isGenerating) {
      focusInterval = setInterval(() => {
        if (textareaRef.current && document.activeElement !== textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 500);
    }
    
    return () => {
      if (focusInterval) {
        clearInterval(focusInterval);
      }
    };
  }, [isGenerating]);
  
  // Track cursor position for visual effects
  const updateCursorPosition = useCallback(() => {
    if (!textareaRef.current || !containerRef.current) return;
    
    const textarea = textareaRef.current;
    const container = containerRef.current;
    
    // Get cursor position
    const cursorPos = textarea.selectionStart;
    if (cursorPos === textarea.value.length) {
      // Cursor is at the end of text, no need to show effect
      setCursorPosition(null);
      return;
    }
    
    // Get text until cursor
    const textUntilCursor = textarea.value.substring(0, cursorPos);
    
    // Create a temporary element to measure
    const temp = document.createElement('div');
    temp.style.position = 'absolute';
    temp.style.visibility = 'hidden';
    temp.style.whiteSpace = 'pre-wrap';
    temp.style.width = `${textarea.clientWidth}px`;
    temp.style.fontSize = window.getComputedStyle(textarea).fontSize;
    temp.style.fontFamily = window.getComputedStyle(textarea).fontFamily;
    temp.style.lineHeight = window.getComputedStyle(textarea).lineHeight;
    temp.style.padding = window.getComputedStyle(textarea).padding;
    
    // Calculate position after the last line break
    const lastLineBreak = textUntilCursor.lastIndexOf('\n');
    if (lastLineBreak !== -1) {
      temp.textContent = textUntilCursor.substring(lastLineBreak + 1);
    } else {
      temp.textContent = textUntilCursor;
    }
    
    document.body.appendChild(temp);
    
    // Get the measured position
    const tempRect = temp.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    document.body.removeChild(temp);
    
    // Calculate lines
    const lines = textUntilCursor.split('\n').length - 1;
    const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight);
    
    // Get textarea's scroll position
    const scrollTop = textarea.scrollTop;
    
    // Update cursor position
    setCursorPosition({
      left: tempRect.width,
      top: (lines * lineHeight) - scrollTop + tempRect.height
    });
    
  }, []);
  
  // Function to handle form submission
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (message.trim() && !disabled && !isComposing) {
      onSend(message);
      setMessage('');
      
      // Attempt focus after sending
      if (textareaRef.current) {
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 10);
      }
      
      // Reset typing state
      setIsTyping(false);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    }
  }, [message, disabled, onSend, isComposing]);

  // Handle Shift+Enter for newlines and Enter for submission
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    updateCursorPosition();
    
    // Don't submit while IME is composing for international keyboards
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
    
    // Set typing state
    setIsTyping(true);
    
    // Clear existing timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    
    // Set new timer to detect when typing stops
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
    
  }, [handleSubmit, isComposing, updateCursorPosition]);
  
  // Handle composition events for international keyboards (CJK)
  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => setIsComposing(false);

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
    setTimeout(() => {
      adjustTextareaHeight();
      updateCursorPosition();
    }, 0);
  }, [adjustTextareaHeight, updateCursorPosition]);

  // Focus/blur handlers for styling
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);
  
  // Update cursor position while scrolling or resizing
  const handleScroll = useCallback(() => updateCursorPosition(), [updateCursorPosition]);
  
  // Initialize height
  useEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);
  
  // Set up window resize listener
  useEffect(() => {
    window.addEventListener('resize', updateCursorPosition);
    return () => window.removeEventListener('resize', updateCursorPosition);
  }, [updateCursorPosition]);

  // Function to insert text at cursor position
  const insertTextAtCursor = useCallback((text: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const beforeText = message.substring(0, start);
    const afterText = message.substring(end);
    
    const newValue = beforeText + text + afterText;
    setMessage(newValue);
    
    // Focus and set cursor position after the inserted text
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPosition = start + text.length;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
        adjustTextareaHeight();
      }
    }, 0);
  }, [message, adjustTextareaHeight]);

  // Handle code insertion from parent component
  useEffect(() => {
    if (onInsertCode) {
      onInsertCode((codeSnippet: string) => {
        insertTextAtCursor(codeSnippet);
      });
    }
  }, [onInsertCode, insertTextAtCursor]);

  // Handle math insertion from parent component
  useEffect(() => {
    if (onInsertMath) {
      onInsertMath((mathSnippet: string) => {
        insertTextAtCursor(mathSnippet);
      });
    }
  }, [onInsertMath, insertTextAtCursor]);

  return (
    <div className="w-full relative z-50">
      <form 
        onSubmit={handleSubmit}
        className="py-1 relative"
      >
        <div 
          ref={containerRef}
          className={`relative transition-all duration-300 rounded-2xl overflow-hidden ${
            isFocused 
              ? 'ring-2 ring-opacity-70 translate-y-0' 
              : 'ring-1 ring-opacity-30 translate-y-0'
          } ${isTyping ? 'is-typing' : ''}`}
          style={{ 
            backgroundColor: currentTheme.colors.bgSecondary,
            boxShadow: isFocused 
              ? `0 0 0 2px ${currentTheme.colors.accentPrimary}40, 0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)` 
              : '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
            ringColor: isFocused 
              ? currentTheme.colors.accentPrimary
              : currentTheme.colors.borderColor,
          }}
        >
          {/* Ambient gradient effects */}
          <div 
            className={`absolute inset-0 opacity-10 pointer-events-none transition-opacity duration-500 ${isFocused ? 'opacity-20' : 'opacity-10'}`}
            style={{ 
              backgroundImage: `
                radial-gradient(circle at 20% 20%, ${currentTheme.colors.accentPrimary}30 0%, transparent 70%),
                radial-gradient(circle at 80% 80%, ${currentTheme.colors.accentSecondary}30 0%, transparent 70%)
              `,
            }}
          />
          
          {/* Top highlight bar animation */}
          <div 
            className={`absolute top-0 left-0 right-0 h-0.5 transition-opacity duration-300 ${isFocused ? 'opacity-100' : 'opacity-0'}`}
            style={{
              background: `linear-gradient(to right, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary}, ${currentTheme.colors.accentPrimary})`,
              backgroundSize: '200% 100%',
              animation: isFocused ? 'gradientAnimation 6s ease infinite' : 'none'
            }}
          />
          
          {/* Cursor glow effect */}
          {cursorPosition && isFocused && !isGenerating && (
            <div 
              className="absolute pointer-events-none transition-all duration-200 ease-out"
              style={{
                left: `${cursorPosition.left}px`,
                top: `${cursorPosition.top}px`,
                width: '2px',
                height: '1.2em',
                transform: 'translateY(-50%)',
                background: currentTheme.colors.accentPrimary,
                boxShadow: `0 0 10px 2px ${currentTheme.colors.accentPrimary}80`,
                opacity: 0.8,
                animation: 'blink 1s ease-in-out infinite'
              }}
            />
          )}
          
          <textarea 
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onScroll={handleScroll}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            disabled={disabled}
            placeholder={isGenerating ? "AI is generating..." : placeholder}
            rows={1}
            className="w-full px-4 pt-3.5 pb-2 resize-none overflow-auto focus:outline-none z-10 relative"
            style={{ 
              backgroundColor: 'transparent',
              color: currentTheme.colors.textPrimary,
              caretColor: currentTheme.colors.accentPrimary,
              maxHeight: '200px',
            }}
          />
          
          <div className="px-3 pb-2.5 flex justify-between items-center relative z-10">
            <div className="opacity-70 flex-1 text-center" style={{ color: currentTheme.colors.textMuted }}>
              <div className="text-xs flex items-center justify-center">
                <kbd className="px-1.5 py-0.5 rounded text-[10px] font-medium mr-1"
                  style={{
                    backgroundColor: `${currentTheme.colors.bgTertiary}80`,
                    color: currentTheme.colors.textSecondary,
                    border: `1px solid ${currentTheme.colors.borderColor}40`,
                  }}
                >
                  Shift
                </kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded text-[10px] font-medium mx-1"
                  style={{
                    backgroundColor: `${currentTheme.colors.bgTertiary}80`,
                    color: currentTheme.colors.textSecondary,
                    border: `1px solid ${currentTheme.colors.borderColor}40`,
                  }}
                >
                  ↵
                </kbd>
                <span className="ml-1 text-xs">for line break</span>
              </div>
            </div>
            
            <Button
              disabled={disabled || !message.trim() || isComposing}
              type="submit"
              size="sm"
              className={`rounded-full py-2 px-4 transition-all ${
                !message.trim() || isComposing ? 'opacity-50' : 'opacity-100 hover:scale-[1.03] hover:shadow-lg active:scale-[0.97]'
              }`}
              style={{ 
                background: message.trim() && !isComposing
                  ? `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})` 
                  : `${currentTheme.colors.bgTertiary}`,
                color: message.trim() && !isComposing ? '#fff' : currentTheme.colors.textMuted,
                boxShadow: message.trim() && !isComposing ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
              }}
            >
              <div className="flex items-center text-sm font-medium">
                {isGenerating ? (
                  <>
                    <span className="mr-1.5">Generating</span>
                    <div className="flex space-x-1 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'currentColor', animationDuration: '1s' }}></div>
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'currentColor', animationDuration: '1s', animationDelay: '0.15s' }}></div>
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'currentColor', animationDuration: '1s', animationDelay: '0.3s' }}></div>
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
          
          {/* Bottom shine effect */}
          <div 
            className={`absolute bottom-0 left-0 right-0 h-40 pointer-events-none transition-opacity duration-300 ${isTyping ? 'opacity-15' : 'opacity-0'}`}
            style={{
              background: `radial-gradient(ellipse at bottom, ${currentTheme.colors.accentPrimary}40, transparent)`,
              transform: 'translateY(65%)'
            }}
          />
        </div>
      </form>
    </div>
  );
};

export default ChatInput;