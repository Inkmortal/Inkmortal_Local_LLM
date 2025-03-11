import React, { useRef } from 'react';
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
 * and the ChatInput component which expects onSend
 */
const ChatInputAdapter: React.FC<ChatInputAdapterProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Type a message...",
  isGenerating = false,
  codeInsertRef,
  mathInsertRef
}) => {
  return (
    <ChatInput
      onSend={onSendMessage}
      disabled={disabled}
      placeholder={placeholder}
      isGenerating={isGenerating}
      codeInsertRef={codeInsertRef}
      mathInsertRef={mathInsertRef}
    />
  );
};

export default ChatInputAdapter;