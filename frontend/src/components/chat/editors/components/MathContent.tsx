import React, { RefObject } from 'react';
import MathRenderer from '../../../education/MathRenderer';

interface MathContentProps {
  currentTheme: any;
  latex: string;
  setLatex: (latex: string) => void;
  handleInsert: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  mathInputRef: RefObject<HTMLTextAreaElement>;
  onClose: () => void;
}

const MathContent: React.FC<MathContentProps> = ({
  currentTheme,
  latex,
  setLatex,
  handleInsert,
  handleKeyDown,
  mathInputRef,
  onClose
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* LaTeX input */}
      <div className="p-3 border-b" style={{ borderColor: `${currentTheme.colors.borderColor}40` }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: currentTheme.colors.textMuted }}
        >
          LaTeX Expression
        </div>
        <textarea
          ref={mathInputRef}
          value={latex}
          onChange={e => setLatex(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full p-3 min-h-[120px] max-h-[150px] rounded-md mb-3 font-mono text-sm"
          style={{ 
            backgroundColor: currentTheme.colors.bgPrimary,
            color: currentTheme.colors.textPrimary,
            border: `1px solid ${currentTheme.colors.borderColor}40`
          }}
          placeholder="\sum_{i=1}^{n} i^2 = \frac{n(n+1)(2n+1)}{6}"
        />
      </div>
      
      {/* Preview */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: currentTheme.colors.textMuted }}
        >
          Preview
        </div>
        <div 
          className="flex items-center justify-center p-4 rounded-md"
          style={{ 
            backgroundColor: `${currentTheme.colors.bgTertiary}20`,
            border: `1px solid ${currentTheme.colors.borderColor}40`,
            minHeight: '100px'
          }}
        >
          {latex ? (
            <MathRenderer latex={latex} display={true} />
          ) : (
            <span className="text-sm italic" style={{ color: currentTheme.colors.textMuted }}>
              Enter a LaTeX expression or select a template to see a preview
            </span>
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
            Insert Expression
          </button>
        </div>
      </div>
    </div>
  );
};

export default MathContent;