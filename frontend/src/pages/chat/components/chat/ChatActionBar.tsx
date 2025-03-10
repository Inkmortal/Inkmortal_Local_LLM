import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

interface ChatActionBarProps {
  onInsertCode: () => void;
  onInsertMath: () => void;
  onShowLanguageSelector: () => void;
  onToggleFileUpload: () => void;
  showFileUpload: boolean;
}

const ChatActionBar: React.FC<ChatActionBarProps> = ({
  onInsertCode,
  onInsertMath,
  onShowLanguageSelector,
  onToggleFileUpload,
  showFileUpload
}) => {
  const { currentTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      {/* File Upload Button */}
      <button
        onClick={onToggleFileUpload}
        className={`p-1.5 rounded-md transition-colors flex items-center justify-center ${
          showFileUpload ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        title={showFileUpload ? "Hide file upload" : "Attach file"}
        style={{
          color: showFileUpload ? currentTheme.colors.accentPrimary : currentTheme.colors.textSecondary,
        }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      </button>
      
      {/* Code Snippet Button */}
      <button
        onClick={onInsertCode}
        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
        title="Insert code snippet"
        style={{
          color: currentTheme.colors.textSecondary,
        }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </button>
      
      {/* Math Expression Button */}
      <button
        onClick={onInsertMath}
        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
        title="Insert math expression"
        style={{
          color: currentTheme.colors.textSecondary,
        }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.871 4A17.926 17.926 0 003 12c0 2.874.673 5.59 1.871 8m14.13 0a17.926 17.926 0 001.87-8c0-2.874-.673-5.59-1.87-8M9 9h1.246a1 1 0 01.961.725l1.586 5.55a1 1 0 00.961.725H15m1-7h-.08a2 2 0 00-1.519.698L9.6 15.302A2 2 0 018.08 16H8" />
        </svg>
      </button>
      
      {/* Language Selector Button */}
      <button
        onClick={onShowLanguageSelector}
        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
        title="Select programming language"
        style={{
          color: currentTheme.colors.textSecondary,
        }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  );
};

export default ChatActionBar;