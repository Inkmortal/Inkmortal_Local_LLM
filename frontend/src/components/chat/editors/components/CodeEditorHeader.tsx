import React from 'react';

interface CodeEditorHeaderProps {
  currentTheme: any;
  onClose: () => void;
}

const CodeEditorHeader: React.FC<CodeEditorHeaderProps> = ({ 
  currentTheme, 
  onClose 
}) => {
  return (
    <div className="p-4 border-b flex justify-between items-center"
      style={{ borderColor: `${currentTheme.colors.borderColor}40` }}
    >
      <h3 className="text-lg font-medium" style={{ color: currentTheme.colors.textPrimary }}>
        Code Block Editor
      </h3>
      <button
        onClick={onClose}
        className="p-1 rounded-full"
        style={{ 
          color: currentTheme.colors.textSecondary,
          backgroundColor: `${currentTheme.colors.bgTertiary}00`
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default CodeEditorHeader;