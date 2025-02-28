import React from 'react';
import EnhancedChatInput from './EnhancedChatInput';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onInsertCode?: (codeSnippet: string) => void;
  onInsertMath?: (mathSnippet: string) => void;
  isGenerating?: boolean;
}

/**
 * ChatInput component that leverages the new EnhancedChatInput
 * while maintaining backward compatibility with existing interfaces
 */
const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  isGenerating = false,
  inputRef,
  onInsertCode,
  onInsertMath
}) => {
  return (
    <EnhancedChatInput
      onSend={onSend}
      disabled={disabled}
      placeholder={placeholder}
      isGenerating={isGenerating}
      inputRef={inputRef}
    />
  );
};

export default ChatInput;