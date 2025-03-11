import React from 'react';
import ChatInput from './ChatInput';

interface ChatInputAdapterProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isGenerating?: boolean;
  codeInsertRef?: React.MutableRefObject<((code: string) => void) | undefined>;
  mathInsertRef?: React.MutableRefObject<((math: string) => void) | undefined>;
}

/**
 * Adapter component to translate between components using onSendMessage
 * and the ChatInput component which expects onSend.
 */
const ChatInputAdapter: React.FC<ChatInputAdapterProps> = ({
  onSendMessage,
  placeholder = "Type a message...",
  isGenerating = false,
  codeInsertRef,
  mathInsertRef
}) => {
  return (
    <div className="chat-input">
      <ChatInput
        onSend={onSendMessage}
        placeholder={placeholder}
        isGenerating={isGenerating}
        codeInsertRef={codeInsertRef}
        mathInsertRef={mathInsertRef}
      />
    </div>
  );
};

export default ChatInputAdapter;