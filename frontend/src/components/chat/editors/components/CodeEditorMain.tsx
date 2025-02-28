import React, { RefObject } from 'react';
import CodeBlock from '../../../education/CodeBlock';

interface CodeEditorMainProps {
  currentTheme: any;
  code: string;
  setCode: (code: string) => void;
  language: string;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  codeInputRef: RefObject<HTMLTextAreaElement>;
  onClose: () => void;
  handleInsert: () => void;
}

const CodeEditorMain: React.FC<CodeEditorMainProps> = ({
  currentTheme,
  code,
  setCode,
  language,
  handleKeyDown,
  codeInputRef,
  onClose,
  handleInsert
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Code input */}
      <div className="p-3 border-b flex-1 min-h-[200px] max-h-[400px] overflow-hidden flex flex-col" 
        style={{ borderColor: `${currentTheme.colors.borderColor}40` }}
      >
        <div className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: currentTheme.colors.textMuted }}
        >
          Code
        </div>
        <textarea
          ref={codeInputRef}
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full flex-1 p-3 font-mono text-sm resize-none overflow-y-auto"
          style={{ 
            backgroundColor: '#282c34',
            color: '#abb2bf',
            border: 'none',
            outline: 'none',
            borderRadius: '0.375rem'
          }}
          placeholder="// Enter your code here"
        />
      </div>
      
      {/* Preview */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: currentTheme.colors.textMuted }}
        >
          Preview
        </div>
        <div className="rounded-md overflow-hidden">
          {code ? (
            <CodeBlock code={code} language={language} />
          ) : (
            <div className="p-4 text-center" 
              style={{ 
                backgroundColor: '#282c34',
                color: '#abb2bf',
                borderRadius: '0.375rem'
              }}
            >
              <span className="text-sm italic opacity-50">
                Enter code or select a snippet to see preview
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="p-3 border-t flex justify-between"
        style={{ borderColor: `${currentTheme.colors.borderColor}40` }}
      >
        <div className="text-xs flex items-center"
          style={{ color: currentTheme.colors.textMuted }}
        >
          <span className="hidden md:inline">Tip: Press</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] mx-1"
            style={{
              backgroundColor: `${currentTheme.colors.bgTertiary}80`,
              color: currentTheme.colors.textSecondary,
              border: `1px solid ${currentTheme.colors.borderColor}40`,
            }}
          >
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter
          </kbd>
          <span className="hidden md:inline">to insert</span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md"
            style={{ 
              backgroundColor: `${currentTheme.colors.bgTertiary}40`,
              color: currentTheme.colors.textSecondary
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            className="px-4 py-2 rounded-md"
            style={{ 
              background: `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
              color: '#fff'
            }}
          >
            Insert Code Block
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeEditorMain;