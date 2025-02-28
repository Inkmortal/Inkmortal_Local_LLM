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
    <div 
      className="px-4 py-2 flex items-center justify-center"
      style={{ 
        background: 'transparent',
        position: 'relative',
        zIndex: 30,
      }}
    >
      <div className="flex items-center gap-2 mx-auto">
        {/* File Upload Button */}
        <Button
          size="xs"
          variant={showFileUpload ? "default" : "ghost"}
          className="rounded-full p-1.5 transition-all"
          style={{
            color: showFileUpload 
              ? '#fff'
              : currentTheme.colors.textSecondary,
            backgroundColor: showFileUpload 
              ? currentTheme.colors.accentTertiary
              : `${currentTheme.colors.bgTertiary}40`,
          }}
          title={showFileUpload ? "Hide file upload" : "Attach file"}
          onClick={() => setShowFileUpload(!showFileUpload)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </Button>
        
        {/* Code Snippet Button */}
        <Button
          size="xs"
          variant={showCodeSelector ? "default" : "ghost"}
          className="rounded-full p-1.5 transition-all"
          style={{
            color: showCodeSelector 
              ? '#fff' 
              : currentTheme.colors.textSecondary,
            backgroundColor: showCodeSelector 
              ? currentTheme.colors.accentPrimary 
              : `${currentTheme.colors.bgTertiary}40`,
          }}
          title="Insert code snippet"
          onClick={() => {
            // This sends a direct command to open the advanced code editor modal
            handleInsertCode("OPEN_MODAL");
            // Old behavior is commented out as the advanced modal will be used
            // setShowCodeSelector(true);
            // setShowMathSelector(false);
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </Button>
        
        {/* Math Expression Button */}
        <Button
          size="xs"
          variant={showMathSelector ? "default" : "ghost"}
          className="rounded-full p-1.5 transition-all"
          style={{
            color: showMathSelector 
              ? '#fff' 
              : currentTheme.colors.textSecondary,
            backgroundColor: showMathSelector 
              ? currentTheme.colors.accentSecondary 
              : `${currentTheme.colors.bgTertiary}40`,
          }}
          title="Insert math expression"
          onClick={() => {
            // This sends a direct command to open the advanced math editor modal
            handleInsertMath("OPEN_MODAL");
            // Old behavior is commented out as the advanced modal will be used
            // setShowMathSelector(true);
            // setShowCodeSelector(false);
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.871 4A17.926 17.926 0 003 12c0 2.874.673 5.59 1.871 8m14.13 0a17.926 17.926 0 001.87-8c0-2.874-.673-5.59-1.87-8M9 9h1.246a1 1 0 01.961.725l1.586 5.55a1 1 0 00.961.725H15m1-7h-.08a2 2 0 00-1.519.698L9.6 15.302A2 2 0 018.08 16H8" />
          </svg>
        </Button>
        
        {selectedFile && (
          <div 
            className="text-xs px-2 py-1 rounded-full animate-fade-in flex items-center ml-1"
            style={{ 
              backgroundColor: `${currentTheme.colors.accentTertiary}15`,
              color: currentTheme.colors.textSecondary,
              border: `1px solid ${currentTheme.colors.accentTertiary}30`
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
      </div>
      
      {/* Formula Selector popup */}
      <FormulaSelector 
        isOpen={showMathSelector}
        onClose={() => setShowMathSelector(false)}
        onSelect={handleFormulaSelect}
      />
      
      {/* Language Selector popup */}
      <LanguageSelector
        isOpen={showCodeSelector}
        onClose={() => setShowCodeSelector(false)}
        onSelect={handleLanguageSelect}
      />
    </div>
  );
};

export default ChatActionBar;