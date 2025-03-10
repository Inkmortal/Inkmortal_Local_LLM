import React, { useRef, useEffect, useState } from 'react';
import ChatWindow from '../../../../components/chat/ChatWindow';
import TipTapEditor from '../../../../components/chat/editor/TipTapEditor';
import FileUploadArea from './FileUploadArea';
import ChatActionBar from './ChatActionBar';
import { Message } from '../../types/chat';
import CodeEditor from '../../../../components/chat/editors/CodeEditor';
import MathExpressionEditor from '../../../../components/chat/editors/MathExpressionEditor';
import LanguageSelector from './languageSelector/LanguageSelector';
import EmptyConversationView from '../EmptyConversationView';

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
  const [languageSelectorOpen, setLanguageSelectorOpen] = useState(false);
  
  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const handleCodeSelected = (language: string, template?: string) => {
    handleInsertCode(language, template);
    setLanguageSelectorOpen(false);
  };
  
  const handleCodeEditorSave = (code: string) => {
    // Insert the code into the editor
    if (codeInsertRef.current) {
      codeInsertRef.current(code);
    }
    setCodeEditorOpen(false);
  };
  
  const handleMathEditorSave = (mathExpression: string) => {
    // Insert the math expression into the editor
    if (mathInsertRef.current) {
      mathInsertRef.current(mathExpression);
    }
    setMathEditorOpen(false);
  };
  
  // Show empty state if no messages
  const showEmptyState = messages.length === 0 && !loading;
  
  return (
    <div className="relative flex flex-col h-full flex-grow overflow-hidden">
      {/* Content area */}
      <div className="flex-grow flex flex-col overflow-hidden">
        {showEmptyState ? (
          <EmptyConversationView onSendMessage={onSendMessage} />
        ) : (
          <>
            {/* Messages area */}
            <div className="flex-grow overflow-hidden">
              <ChatWindow 
                messages={messages}
                loading={loading}
                onRegenerate={onRegenerate}
                onStopGeneration={onStopGeneration}
                isGenerating={isGenerating}
              />
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
        
        {/* Input area - always visible */}
        <div className="w-full">
          {showFileUpload && (
            <FileUploadArea
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              setShowFileUpload={setShowFileUpload}
            />
          )}
          
          <div className="relative border-t border-gray-200 dark:border-gray-700">
            <TipTapEditor 
              onSendMessage={onSendMessage}
              loading={loading || isGenerating}
              codeInsertRef={codeInsertRef}
              mathInsertRef={mathInsertRef}
            />
            
            <ChatActionBar 
              onInsertCode={() => setCodeEditorOpen(true)}
              onInsertMath={() => setMathEditorOpen(true)}
              onShowLanguageSelector={() => setLanguageSelectorOpen(true)}
              onToggleFileUpload={() => setShowFileUpload(!showFileUpload)}
              showFileUpload={showFileUpload}
            />
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {codeEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-5xl h-5/6 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <CodeEditor 
              onClose={() => setCodeEditorOpen(false)}
              onSave={handleCodeEditorSave}
            />
          </div>
        </div>
      )}
      
      {mathEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl h-5/6 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <MathExpressionEditor 
              onClose={() => setMathEditorOpen(false)}
              onSave={handleMathEditorSave}
            />
          </div>
        </div>
      )}
      
      {languageSelectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <LanguageSelector 
              onClose={() => setLanguageSelectorOpen(false)}
              onSelect={handleCodeSelected}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;