import React, { useEffect, useRef } from 'react';
import ChatInput from './ChatInput';

interface ChatInputAdapterProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isGenerating?: boolean;
  showFileUpload?: boolean;
  toggleFileUpload?: () => void;
  codeInsertRef?: React.MutableRefObject<((code: string) => void) | undefined>;
  mathInsertRef?: React.MutableRefObject<((math: string) => void) | undefined>;
  handleInsertCode?: (language?: string, template?: string) => void;
  handleInsertMath?: (formula?: string) => void;
}

/**
 * This adapter component translates between components using onSendMessage
 * and the ChatInput component which expects onSend.
 * It also addresses a focus issue by forcing focus on the input after message generation.
 */
const ChatInputAdapter: React.FC<ChatInputAdapterProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Type a message...",
  isGenerating = false,
  codeInsertRef,
  mathInsertRef
}) => {
  // Track previous generating state to detect when generation completes
  const wasGenerating = useRef(isGenerating);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get a ref to the actual textarea from the ChatInput
  const setTextareaRef = (element: HTMLTextAreaElement | null) => {
    textareaRef.current = element;
  };
  
  // Clean up any pending timeouts on unmount
  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
    };
  }, []);
  
  // When generation finishes, force focus on the input after a short delay
  useEffect(() => {
    const generationJustCompleted = wasGenerating.current && !isGenerating;
    wasGenerating.current = isGenerating;
    
    if (generationJustCompleted) {
      // Clean up any existing timeout
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      
      // Set timeout to focus after generation completes
      focusTimeoutRef.current = setTimeout(() => {
        console.log('Generation completed, focusing input...');
        
        // Try to focus the textarea directly using ref
        if (textareaRef.current) {
          try {
            console.log('Focusing textarea using ref');
            textareaRef.current.focus();
            textareaRef.current.click(); // Sometimes click can help with focus issues
            
            // Put cursor at end of text
            const length = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(length, length);
          } catch (e) {
            console.error('Error focusing textarea:', e);
          }
        } else {
          console.warn('Textarea ref not available, trying DOM query');
          
          // Fallback to DOM query if ref not available
          try {
            const textarea = document.querySelector('.chat-input textarea');
            if (textarea) {
              (textarea as HTMLTextAreaElement).focus();
            } else {
              console.warn('Textarea not found by DOM query');
            }
          } catch (e) {
            console.error('Error in DOM query fallback:', e);
          }
        }
        
        focusTimeoutRef.current = null;
      }, 300); // Slightly longer delay for better reliability
    }
  }, [isGenerating]);
  
  return (
    <div className="chat-input">
      <ChatInput
        onSend={onSendMessage}
        disabled={false} {/* Never disable the input field, only disable the send button */}
        placeholder={placeholder}
        isGenerating={isGenerating}
        codeInsertRef={codeInsertRef}
        mathInsertRef={mathInsertRef}
        inputRef={textareaRef}
        forwardedRef={setTextareaRef}
      />
    </div>
  );
};

export default ChatInputAdapter;