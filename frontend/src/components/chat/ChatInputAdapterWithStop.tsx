import React from 'react';
import ChatInput from './ChatInput';

interface ChatInputAdapterProps {
  onSendMessage: (message: string) => void;
  onStopGeneration?: () => void;
  placeholder?: string;
  isGenerating?: boolean;
  codeInsertRef?: React.MutableRefObject<((code: string) => void) | undefined>;
  mathInsertRef?: React.MutableRefObject<((math: string) => void) | undefined>;
}

/**
 * Enhanced adapter component that supports the stop generation feature
 */
const ChatInputAdapterWithStop: React.FC<ChatInputAdapterProps> = ({
  onSendMessage,
  onStopGeneration,
  placeholder = "Type a message...",
  isGenerating = false,
  codeInsertRef,
  mathInsertRef
}) => {
  return (
    <div className="chat-input">
      {isGenerating ? (
        // Show stop button when generating
        <div className="w-full">
          <button
            onClick={onStopGeneration}
            className="w-full rounded-xl py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium 
                     hover:from-red-600 hover:to-red-700 active:scale-[0.97] transition-all duration-200
                     shadow-md hover:shadow-lg flex items-center justify-center"
          >
            <span className="mr-2">Stop Generating</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        // Show normal chat input when not generating
        <ChatInput
          onSend={onSendMessage}
          placeholder={placeholder}
          isGenerating={isGenerating}
          codeInsertRef={codeInsertRef}
          mathInsertRef={mathInsertRef}
        />
      )}
    </div>
  );
};

export default ChatInputAdapterWithStop;