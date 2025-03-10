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
  isQueueLoading?: boolean;
  isProcessing?: boolean;
  queuePosition?: number;
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
  isQueueLoading,
  isProcessing,
  queuePosition
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Modal states for editors and selectors
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [mathEditorOpen, setMathEditorOpen] = useState(false);
  const [languageSelectorOpen, setLanguageSelectorOpen] = useState(false);
  
  // Auto-scroll when messages change
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Handle code selection from language selector
  const handleCodeSelected = (language: string, template?: string) => {
    handleInsertCode(language, template);
    setLanguageSelectorOpen(false);
  };
  
  // Handle code editor save
  const handleCodeEditorSave = (code: string) => {
    if (codeInsertRef.current) {
      codeInsertRef.current(code);
    }
    setCodeEditorOpen(false);
  };
  
  // Handle math editor save
  const handleMathEditorSave = (mathExpression: string) => {
    if (mathInsertRef.current) {
      mathInsertRef.current(mathExpression);
    }
    setMathEditorOpen(false);
  };
  
  // Show empty conversation view if no messages
  const showEmptyState = messages.length === 0 && !loading;
  
  return (
    <div className="relative flex flex-col h-full flex-grow overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-grow flex flex-col overflow-hidden">
        {showEmptyState ? (
          <EmptyConversationView onSendMessage={onSendMessage} />
        ) : (
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
        )}
        
        {/* Input Area */}
        <div className="w-full pb-2">
          {/* File Upload Area - Shown conditionally */}
          {showFileUpload && (
            <FileUploadArea
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              setShowFileUpload={setShowFileUpload}
            />
          )}
          
          {/* Input Container with Action Bar */}
          <div className="px-4 py-2 relative">
            {/* Action Bar - Positioned on top */}
            <div className="flex justify-end items-center mb-2 space-x-1 max-w-4xl mx-auto">
              <ChatActionBar 
                onInsertCode={() => setCodeEditorOpen(true)}
                onInsertMath={() => setMathEditorOpen(true)}
                onShowLanguageSelector={() => setLanguageSelectorOpen(true)}
                onToggleFileUpload={() => setShowFileUpload(!showFileUpload)}
                showFileUpload={showFileUpload}
              />
            </div>
            
            {/* TipTap Editor */}
            <div className="mx-auto max-w-4xl rounded-xl overflow-hidden transition-all"
              style={{
                boxShadow: `0 4px 15px rgba(0, 0, 0, 0.06)`,
                border: `1px solid rgba(0, 0, 0, 0.1)`,
              }}
            >
              <TipTapEditor
                onSend={onSendMessage}
                disabled={loading || isGenerating}
                placeholder="Message Inkmortal..."
                isGenerating={isGenerating}
                onInsertCode={(handler) => {
                  codeInsertRef.current = handler;
                }}
                onInsertMath={(handler) => {
                  mathInsertRef.current = handler;
                }}
              />
            </div>
            
            {/* Helper text for keyboard shortcuts */}
            <div className="text-xs text-center mt-1.5 opacity-70 text-gray-500 dark:text-gray-400">
              Press <kbd className="px-1.5 py-0.5 rounded text-[10px] mx-1 bg-gray-100 dark:bg-gray-800">Shift</kbd> + <kbd className="px-1.5 py-0.5 rounded text-[10px] mx-1 bg-gray-100 dark:bg-gray-800">Enter</kbd> for new line
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal Dialogs */}
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