import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface MathRendererProps {
  latex: string;
  display?: boolean;
  className?: string;
}

const MathRenderer: React.FC<MathRendererProps> = ({ 
  latex, 
  display = false,
  className = ''
}) => {
  const { currentTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`math-renderer ${className}`}>
      <div 
        className={`${display ? 'block py-4 px-4' : 'inline-block py-1 px-2'} relative group`}
        style={{ 
          backgroundColor: display ? `${currentTheme.colors.bgTertiary}40` : 'transparent',
          borderRadius: '0.375rem',
          border: display ? `1px solid ${currentTheme.colors.borderColor}40` : 'none'
        }}
      >
        {display && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              className="text-xs px-2 py-0.5 rounded"
              style={{ 
                backgroundColor: copied 
                  ? `${currentTheme.colors.accentSecondary}20` 
                  : `${currentTheme.colors.accentPrimary}20`,
                color: copied 
                  ? currentTheme.colors.accentSecondary 
                  : currentTheme.colors.accentPrimary
              }}
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
        
        <div className={`${display ? 'text-center' : ''} math-content`}>
          {display ? (
            <BlockMath math={latex} errorColor={currentTheme.colors.error} />
          ) : (
            <InlineMath math={latex} errorColor={currentTheme.colors.error} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MathRenderer;