import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';
import MathExpressionEditor from './editors/MathExpressionEditor';
import CodeEditor from './editors/CodeEditor';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStopGeneration?: () => void;
  onFileSelect?: (file: File) => void; // Added for file attachment
  disabled?: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  forwardedRef?: (element: HTMLTextAreaElement | null) => void;
  onInsertCode?: (codeSnippet: string) => void;
  onInsertMath?: (mathSnippet: string) => void;
  isGenerating?: boolean;
  codeInsertRef?: React.MutableRefObject<((code: string) => void) | undefined>;
  mathInsertRef?: React.MutableRefObject<((math: string) => void) | undefined>;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend,
  onStopGeneration, 
  onFileSelect,
  disabled = false, 
  placeholder = "Type a message...",
  isGenerating = false,
  inputRef,
  forwardedRef,
  onInsertCode,
  onInsertMath,
  codeInsertRef,
  mathInsertRef
}) => {
  const { currentTheme } = useTheme();
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  
  // State for editor popups
  const [showMathEditor, setShowMathEditor] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  // Format menu no longer needed since we're using direct buttons
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track if user is actively typing for advanced effects
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Register insert handlers via refs if provided
  useEffect(() => {
    if (codeInsertRef) {
      codeInsertRef.current = (code: string) => {
        insertTextAtCursor(`\`\`\`\n${code}\n\`\`\``);
      };
    }
    if (mathInsertRef) {
      mathInsertRef.current = (math: string) => {
        insertTextAtCursor(`$${math}$`);
      };
    }
  }, [codeInsertRef, mathInsertRef]);
  
  // Pass textarea ref to parent component via callback ref
  useEffect(() => {
    if (forwardedRef && textareaRef.current) {
      forwardedRef(textareaRef.current);
    }
  }, [forwardedRef]);
  
  // Focus management
  useEffect(() => {
    if (!disabled && textareaRef.current && !showMathEditor && !showCodeEditor) {
      textareaRef.current.focus();
    }
  }, [disabled, showMathEditor, showCodeEditor]);
  
  // Function to handle form submission
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    
    // First check if we're generating - if so, don't submit
    if (isGenerating) {
      console.log('Prevented message submission during generation');
      return;
    }
    
    if (message.trim() && !isComposing) {
      onSend(message);
      setMessage('');
      
      // Reset typing state
      setIsTyping(false);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      
      // Keep focus on the textarea after sending a message
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 10);
    }
  }, [message, isGenerating, onSend, isComposing]);

  // Handle Shift+Enter for newlines and Enter for submission
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't submit while IME is composing for international keyboards
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      
      // Only proceed if not generating
      if (!isGenerating) {
        handleSubmit();
      } else {
        console.log('Prevented submission via Enter key during generation');
      }
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
    
  }, [handleSubmit, isComposing, isGenerating]);
  
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
    }, 0);
  }, [adjustTextareaHeight]);

  // Focus/blur handlers for styling
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);
  
  // Initialize height
  useEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

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

  // Handle math insertion from modal
  const handleMathInsert = (latex: string) => {
    insertTextAtCursor(`$${latex}$`);
    setShowMathEditor(false);
    
    if (onInsertMath) {
      onInsertMath(latex);
    }
  };

  // Handle code insertion from modal
  const handleCodeInsert = (code: string, language: string) => {
    insertTextAtCursor(`\`\`\`${language}\n${code}\n\`\`\``);
    setShowCodeEditor(false);
    
    if (onInsertCode) {
      onInsertCode(code);
    }
  };
  
  // Convert selected text to math
  const convertSelectedToMath = () => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    // Check if text is selected
    if (start !== end) {
      const selectedText = message.substring(start, end);
      const mathText = `$${selectedText}$`;
      
      // Replace selected text with math format
      const newMessage = message.substring(0, start) + mathText + message.substring(end);
      setMessage(newMessage);
      
      // Set cursor position after the inserted math
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = start + mathText.length;
          textareaRef.current.setSelectionRange(newPosition, newPosition);
          textareaRef.current.focus();
        }
      }, 0);
    } else {
      // If no text is selected, open math editor
      setShowMathEditor(true);
    }
    
    setShowFormatMenu(false);
  };

  // Convert selected text to code
  const convertSelectedToCode = () => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    // Check if text is selected
    if (start !== end) {
      const selectedText = message.substring(start, end);
      const codeText = `\`\`\`\n${selectedText}\n\`\`\``;
      
      // Replace selected text with code format
      const newMessage = message.substring(0, start) + codeText + message.substring(end);
      setMessage(newMessage);
      
      // Set cursor position after the inserted code
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = start + codeText.length;
          textareaRef.current.setSelectionRange(newPosition, newPosition);
          textareaRef.current.focus();
        }
      }, 0);
    } else {
      // If no text is selected, open code editor
      setShowCodeEditor(true);
    }
    
    setShowFormatMenu(false);
  };

  // The format menu is no longer needed since we have direct buttons
  // This function is kept for possible future use

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
          
          <textarea 
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            disabled={false} // Always enabled to allow typing during generation
            placeholder={placeholder}
            rows={1}
            className="w-full px-4 pt-3.5 pb-2 resize-none overflow-auto focus:outline-none z-10 relative"
            style={{ 
              backgroundColor: 'transparent',
              color: currentTheme.colors.textPrimary,
              caretColor: currentTheme.colors.accentPrimary,
              maxHeight: '200px',
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            }}
          />
          
          <div className="px-3 pb-2.5 flex justify-between items-center relative z-10">
            {/* Format buttons with visual separation */}
            <div className="flex items-center">
              {/* Insert buttons group */}
              <div className="flex space-x-2 items-center">
                {/* Add Code Block button */}
                <button
                  type="button"
                  onClick={() => setShowCodeEditor(true)}
                  className="p-2 rounded-full transition-colors hover:bg-opacity-10"
                  style={{
                    backgroundColor: 'transparent',
                    color: currentTheme.colors.textSecondary,
                  }}
                  title="Insert code block"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </button>
                
                {/* Add Math Expression button */}
                <button
                  type="button"
                  onClick={() => setShowMathEditor(true)}
                  className="p-2 rounded-full transition-colors hover:bg-opacity-10"
                  style={{
                    backgroundColor: 'transparent',
                    color: currentTheme.colors.textSecondary,
                  }}
                  title="Insert math expression"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 6h16M4 12h4m6 0h6M4 18h8M16 18h4" />
                  </svg>
                </button>
                
                {/* Attach File button */}
                <label className="cursor-pointer">
                  <input 
                    type="file" 
                    className="hidden"
                    onChange={(e) => e.target.files && e.target.files[0] && onFileSelect && onFileSelect(e.target.files[0])}
                  />
                  <div
                    className="p-2 rounded-full transition-colors hover:bg-opacity-10"
                    style={{
                      backgroundColor: 'transparent',
                      color: currentTheme.colors.textSecondary,
                    }}
                    title="Attach file"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                    </svg>
                  </div>
                </label>
              </div>
              
              {/* Separator */}
              <div 
                className="mx-2 h-6" 
                style={{
                  width: '1px', 
                  backgroundColor: `${currentTheme.colors.borderColor}40`
                }}
              />
              
              {/* Convert/Highlight buttons group */}
              <div className="flex space-x-2 items-center">
                {/* Convert Selected Text To Code */}
                <button
                  type="button"
                  onClick={convertSelectedToCode}
                  className="p-2 rounded-full transition-colors hover:bg-opacity-10"
                  style={{
                    backgroundColor: 'transparent',
                    color: currentTheme.colors.textSecondary,
                  }}
                  title="Convert selection to code block"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 17l6-6-6-6M12 21h8" />
                  </svg>
                </button>
                
                {/* Convert Selected Text To Math */}
                <button
                  type="button"
                  onClick={convertSelectedToMath}
                  className="p-2 rounded-full transition-colors hover:bg-opacity-10"
                  style={{
                    backgroundColor: 'transparent',
                    color: currentTheme.colors.textSecondary,
                  }}
                  title="Convert selection to math expression"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 9h16M4 15h10" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Show Stop button if generating */}
            {isGenerating && onStopGeneration ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="mr-2 rounded-full p-2 transition-all hover:scale-[1.05] hover:bg-red-500/10"
                style={{ 
                  backgroundColor: `${currentTheme.colors.textMuted}10`,
                  color: currentTheme.colors.textMuted,
                }}
                title="Stop generation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : null}
            
            {/* Send button - always visible but conditionally enabled */}
            <Button
              disabled={!message.trim() || isComposing || (isGenerating && !message.trim())}
              type="submit"
              size="sm"
              className={`rounded-full py-2 px-4 transition-all ${
                !message.trim() || (isGenerating && !message.trim()) || isComposing ? 'opacity-50' : 'opacity-100 hover:scale-[1.03] hover:shadow-lg active:scale-[0.97]'
              }`}
              style={{ 
                background: message.trim() && (!isGenerating || message.trim()) && !isComposing
                  ? `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})` 
                  : `${currentTheme.colors.bgTertiary}`,
                color: message.trim() && (!isGenerating || message.trim()) && !isComposing ? '#fff' : currentTheme.colors.textMuted,
                boxShadow: message.trim() && (!isGenerating || message.trim()) && !isComposing ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
              }}
            >
              <div className="flex items-center text-sm font-medium">
                <span>Send</span>
                <svg className="ml-1.5 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
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
      
      <div className="text-xs text-center mt-2 opacity-70" style={{ color: currentTheme.colors.textMuted }}>
        <div className="text-xs flex items-center justify-center">
          <span>Use</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-medium mx-1"
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
          <span className="ml-1">for line break</span>
        </div>
      </div>
      
      {/* Math Expression Editor */}
      {showMathEditor && (
        <MathExpressionEditor
          onInsert={handleMathInsert}
          onClose={() => setShowMathEditor(false)}
        />
      )}
      
      {/* Code Editor */}
      {showCodeEditor && (
        <CodeEditor
          onInsert={handleCodeInsert}
          onClose={() => setShowCodeEditor(false)}
        />
      )}
    </div>
  );
};

export default ChatInput;