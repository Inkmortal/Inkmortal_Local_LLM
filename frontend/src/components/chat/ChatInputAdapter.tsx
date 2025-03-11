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
  
  // When generation finishes, force focus on the input after a short delay
  useEffect(() => {
    const generationJustCompleted = wasGenerating.current && !isGenerating;
    wasGenerating.current = isGenerating;
    
    if (generationJustCompleted) {
      // First delay is to allow any pending operations to complete
      setTimeout(() => {
        console.log('Generation completed, attempting to re-enable input...');
        
        // Second delay gives a bit more time for UI to stabilize
        setTimeout(() => {
          console.log('Focusing textarea now...');
          // Find and focus the textarea
          const textarea = document.querySelector('.chat-input textarea');
          if (textarea) {
            console.log('Textarea found, focusing now');
            (textarea as HTMLTextAreaElement).click(); // First click to ensure the component is active
            (textarea as HTMLTextAreaElement).focus(); // Then focus
          } else {
            console.warn('Textarea not found to focus');
          }
        }, 150);
      }, 100);
    }
  }, [isGenerating]);
  
  return (
    <div className="chat-input">
      <ChatInput
        onSend={onSendMessage}
        disabled={disabled}
        placeholder={placeholder}
        isGenerating={isGenerating}
        codeInsertRef={codeInsertRef}
        mathInsertRef={mathInsertRef}
        inputRef={inputRef}
      />
    </div>
  );
};

export default ChatInputAdapter;