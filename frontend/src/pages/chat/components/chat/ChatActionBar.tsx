import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import Button from '../../../../components/ui/Button';
import FormulaSelector from './FormulaSelector';
import LanguageSelector from './LanguageSelector';

interface ChatActionBarProps {
  showFileUpload: boolean;
  setShowFileUpload: (show: boolean) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  handleInsertCode: (language?: string, template?: string) => void;
  handleInsertMath: (formula?: string) => void;
}

const ChatActionBar: React.FC<ChatActionBarProps> = ({
  showFileUpload,
  setShowFileUpload,
  selectedFile,
  setSelectedFile,
  handleInsertCode,
  handleInsertMath,
}) => {
  const { currentTheme } = useTheme();
  const [showMathSelector, setShowMathSelector] = useState(false);
  const [showCodeSelector, setShowCodeSelector] = useState(false);
  
  // Handler for language selection
  const handleLanguageSelect = (language: string, template: string) => {
    // Pass the selected language and template to the parent handler
    handleInsertCode(language, template);
  };
  
  // Handler for formula selection
  const handleFormulaSelect = (formula: string) => {
    // Pass the selected formula to the parent handler
    handleInsertMath(formula);
  };

  return (
    <div className="flex space-x-2 transition-opacity duration-300 opacity-90 hover:opacity-100">
      {/* Code Snippet Button */}
      <button
        onClick={() => {
          handleInsertCode("OPEN_MODAL");
        }}
        className="flex items-center justify-center w-10 h-10 rounded-full shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
          color: '#fff'
        }}
        title="Insert Code Block"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </button>
      
      {/* Math Expression Button */}
      <button
        onClick={() => {
          handleInsertMath("OPEN_MODAL");
        }}
        className="flex items-center justify-center w-10 h-10 rounded-full shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${currentTheme.colors.accentSecondary}, ${currentTheme.colors.accentPrimary})`,
          color: '#fff'
        }}
        title="Insert Math Expression"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.871 4A17.926 17.926 0 003 12c0 2.874.673 5.59 1.871 8m14.13 0a17.926 17.926 0 001.87-8c0-2.874-.673-5.59-1.87-8M9 9h1.246a1 1 0 01.961.725l1.586 5.55a1 1 0 00.961.725H15m1-7h-.08a2 2 0 00-1.519.698L9.6 15.302A2 2 0 018.08 16H8" />
        </svg>
      </button>
      
      {/* File Upload Button */}
      <button
        onClick={() => setShowFileUpload(!showFileUpload)}
        className="flex items-center justify-center w-10 h-10 rounded-full shadow-lg"
        style={{
          background: showFileUpload 
            ? `linear-gradient(135deg, ${currentTheme.colors.accentTertiary}, ${currentTheme.colors.accentSecondary})`
            : `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentTertiary})`,
          color: '#fff'
        }}
        title={showFileUpload ? "Hide file upload" : "Attach file"}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      </button>
        
      
      {selectedFile && (
        <div 
          className="absolute left-0 bottom-12 text-xs px-3 py-1.5 rounded-full animate-fade-in flex items-center shadow-md"
          style={{ 
            backgroundColor: `${currentTheme.colors.accentTertiary}15`,
            color: currentTheme.colors.textSecondary,
            border: `1px solid ${currentTheme.colors.accentTertiary}30`,
            transform: 'translateX(-50%)',
            left: '50%'
          }}
        >
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          {selectedFile.name}
          <button 
            className="ml-1.5 hover:text-red-500 transition-colors"
            onClick={() => setSelectedFile(null)}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Hidden but kept for potential future use */}
      <div className="hidden">
        <FormulaSelector 
          isOpen={showMathSelector}
          onClose={() => setShowMathSelector(false)}
          onSelect={handleFormulaSelect}
        />
        
        <LanguageSelector
          isOpen={showCodeSelector}
          onClose={() => setShowCodeSelector(false)}
          onSelect={handleLanguageSelect}
        />
      </div>
    </div>
  );
};

export default ChatActionBar;