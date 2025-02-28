import React, { useRef, useEffect, useState } from 'react';
import ChatWindow from '../../../../components/chat/ChatWindow';
import TipTapEditor from '../../../../components/chat/editor/TipTapEditor';
import FileUploadArea from './FileUploadArea';
import ChatActionBar from './ChatActionBar';
import { Message } from '../../types/chat';
import CodeEditor from '../../../../components/chat/editors/CodeEditor';
import MathExpressionEditor from '../../../../components/chat/editors/MathExpressionEditor';

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
  
  // Add state for modal visibility
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [mathEditorOpen, setMathEditorOpen] = useState(false);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Override the handler functions to open modals directly
  useEffect(() => {
    // Create a simple wrapper function to directly open the code editor modal
    const handleOpenCodeModal = (arg: string) => {
      console.log("Code editor trigger called with:", arg);
      if (arg === "OPEN_MODAL") {
        console.log("Opening code editor modal directly!");
        setCodeEditorOpen(true);
        return;
      }
      
      // If not opening the modal, insert the code
      if (codeInsertRef.current) {
        codeInsertRef.current(arg);
      }
    };
    
    // Create a simple wrapper function to directly open the math editor modal
    const handleOpenMathModal = (arg: string) => {
      console.log("Math editor trigger called with:", arg);
      if (arg === "OPEN_MODAL") {
        console.log("Opening math editor modal directly!");
        setMathEditorOpen(true);
        return;
      }
      
      // If not opening the modal, insert the math
      if (mathInsertRef.current) {
        mathInsertRef.current(arg);
      }
    };
    
    // Register our handler functions with the parent components
    const originalHandleCode = handleInsertCode;
    const originalHandleMath = handleInsertMath;
    
    // Temporarily replace the handlers with our modal-aware ones
    handleInsertCode("REGISTER_HANDLER", handleOpenCodeModal);
    handleInsertMath("REGISTER_HANDLER", handleOpenMathModal);
    
    // Cleanup on unmount
    return () => {
      handleInsertCode("REGISTER_HANDLER", originalHandleCode);
      handleInsertMath("REGISTER_HANDLER", originalHandleMath);
    };
  }, []);

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
          <TipTapEditor
            onSend={onSendMessage}
            disabled={loading}
            placeholder="Message Sea Dragon Inkmortal..."
            isGenerating={isGenerating}
            onInsertCode={codeInsertRef.current}
            onInsertMath={mathInsertRef.current}
          />
        </div>
      </div>
      
      <div ref={messagesEndRef} />
      
      {/* Render the modals conditionally */}
      {codeEditorOpen && (
        <CodeEditor
          onInsert={(code, language) => {
            if (codeInsertRef.current) {
              codeInsertRef.current(`\`\`\`${language}\n${code}\n\`\`\``);
            }
            setCodeEditorOpen(false);
          }}
          onClose={() => setCodeEditorOpen(false)}
        />
      )}
      
      {mathEditorOpen && (
        <MathExpressionEditor
          onInsert={(latex) => {
            if (mathInsertRef.current) {
              mathInsertRef.current(`$$${latex}$$`);
            }
            setMathEditorOpen(false);
          }}
          onClose={() => setMathEditorOpen(false)}
        />
      )}
    </div>
  );
};

export default ChatContainer;