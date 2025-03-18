import React from 'react';
import TipTapAdapter from './TipTapAdapter';

interface TipTapAdapterWithStopProps {
  onSendMessage: (message: string) => void;
  onStopGeneration?: () => void;
  onFileSelect?: (file: File) => void;
  placeholder?: string;
  isGenerating?: boolean;
}

/**
 * Enhanced TipTap adapter component that supports the stop generation feature
 * Uses the EditorContext through TipTapAdapter
 */
const TipTapAdapterWithStop: React.FC<TipTapAdapterWithStopProps> = ({
  onSendMessage,
  onStopGeneration,
  onFileSelect,
  placeholder = "Type a message...",
  isGenerating = false
}) => {
  return (
    <div className="tiptap-adapter-with-stop w-full max-w-chat mx-auto">
      <TipTapAdapter
        onSendMessage={onSendMessage}
        onStopGeneration={onStopGeneration}
        onFileSelect={onFileSelect}
        placeholder={placeholder}
        isGenerating={isGenerating}
      />
    </div>
  );
};

export default TipTapAdapterWithStop;