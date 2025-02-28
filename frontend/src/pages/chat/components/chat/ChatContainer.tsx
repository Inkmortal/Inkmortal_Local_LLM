import React, { useRef, useEffect } from 'react';
import ChatWindow from '../../../../components/chat/ChatWindow';
import ChatInput from '../../../../components/chat/ChatInput';
import FileUploadArea from './FileUploadArea';
import ChatActionBar from './ChatActionBar';
import { Message } from '../../types/chat';

interface ChatContainerProps {
  messages: Message[];
  loading: boolean;
  isGenerating: boolean;
  onSendMessage: (message: string) => void;
  onRegenerate: (messageId: string) => void;
  onStopGeneration: () => void;
  showFileUpload: boolean;
  setShowFileUpload: (show: boolean) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  handleFileSelect: (file: File) => void;
  handleInsertCode: (language?: string, template?: string) => void;
  handleInsertMath: (formula?: string) => void;
  codeInsertRef: React.MutableRefObject<((codeSnippet: string) => void) | undefined>;
  mathInsertRef: React.MutableRefObject<((mathSnippet: string) => void) | undefined>;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  loading,
  isGenerating,
  onSendMessage,
  onRegenerate,
  onStopGeneration,
  showFileUpload,
  setShowFileUpload,
  selectedFile,
  setSelectedFile,
  handleFileSelect,
  handleInsertCode,
  handleInsertMath,
  codeInsertRef,
  mathInsertRef,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // This function will be passed to ChatInput to register code insertion
  const registerCodeInsertHandler = (insertFn: (code: string) => void) => {
    codeInsertRef.current = insertFn;
  };

  // This function will be passed to ChatInput to register math insertion
  const registerMathInsertHandler = (insertFn: (math: string) => void) => {
    mathInsertRef.current = insertFn;
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden">
      {/* Message area */}
      <ChatWindow 
        messages={messages} 
        loading={loading}
        onRegenerate={onRegenerate}
        onStopGeneration={onStopGeneration}
        isGenerating={isGenerating}
      />
    
      {/* File upload area */}
      <FileUploadArea
        showFileUpload={showFileUpload}
        onFileSelect={handleFileSelect}
      />
      
      {/* Action bar with utility buttons */}
      <ChatActionBar
        showFileUpload={showFileUpload}
        setShowFileUpload={setShowFileUpload}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        handleInsertCode={handleInsertCode}
        handleInsertMath={handleInsertMath}
      />
      
      {/* Chat input - styled with glass effect */}
      <div className="px-4 py-3 relative">
        <div className="mx-auto max-w-4xl rounded-2xl overflow-hidden"
          style={{
            boxShadow: `0 4px 20px rgba(0, 0, 0, 0.08)`,
            border: `1px solid rgba(0, 0, 0, 0.1)`,
          }}
        >
          <ChatInput 
            onSend={onSendMessage} 
            disabled={loading}
            placeholder="Message Sea Dragon Inkmortal..."
            isGenerating={isGenerating}
            onInsertCode={registerCodeInsertHandler}
            onInsertMath={registerMathInsertHandler}
          />
        </div>
      </div>
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatContainer;