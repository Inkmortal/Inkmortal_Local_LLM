import React from 'react';
import ChatInput from './ChatInput';

interface ChatInputAdapterProps {
  onSendMessage: (message: string) => void;
  onStopGeneration?: () => void;
  onFileSelect?: (file: File) => void;
  placeholder?: string;
  isGenerating?: boolean;
  codeInsertRef?: React.MutableRefObject<((code: string) => void) | undefined>;
  mathInsertRef?: React.MutableRefObject<((math: string) => void) | undefined>;
}

/**
 * Enhanced adapter component that passes through to the improved ChatInput
 * which now supports typing during generation and a subtle stop button
 */
const ChatInputAdapterWithStop: React.FC<ChatInputAdapterProps> = ({
  onSendMessage,
  onStopGeneration,
  onFileSelect,
  placeholder = "Type a message...",
  isGenerating = false,
  codeInsertRef,
  mathInsertRef
}) => {
  return (
    <div className="chat-input">
      <ChatInput
        onSend={onSendMessage}
        onStopGeneration={onStopGeneration}
        onFileSelect={onFileSelect}
        placeholder={placeholder}
        isGenerating={isGenerating}
        codeInsertRef={codeInsertRef}
        mathInsertRef={mathInsertRef}
      />
    </div>
  );
};

export default ChatInputAdapterWithStop;