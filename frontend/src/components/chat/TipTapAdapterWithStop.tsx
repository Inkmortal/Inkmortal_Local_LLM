import React from 'react';
import TipTapAdapter from './TipTapAdapter';

interface TipTapAdapterWithStopProps {
  onSendMessage: (message: string) => void;
  onStopGeneration?: () => void;
  onFileSelect?: (file: File) => void;
  placeholder?: string;
  isGenerating?: boolean;
  codeInsertRef?: React.MutableRefObject<((code: string) => void) | undefined>;
  mathInsertRef?: React.MutableRefObject<((math: string) => void) | undefined>;
}

/**
 * Enhanced TipTap adapter component that supports the stop generation feature
 * and maintains the same interface as ChatInputAdapterWithStop
 */
const TipTapAdapterWithStop: React.FC<TipTapAdapterWithStopProps> = ({
  onSendMessage,
  onStopGeneration,
  onFileSelect,
  placeholder = "Type a message...",
  isGenerating = false,
  codeInsertRef,
  mathInsertRef
}) => {
  return (
    <div className="tiptap-adapter-with-stop">
      <TipTapAdapter
        onSendMessage={onSendMessage}
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

export default TipTapAdapterWithStop;