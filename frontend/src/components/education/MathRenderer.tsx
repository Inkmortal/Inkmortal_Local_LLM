import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

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
  const containerRef = useRef<HTMLDivElement>(null);
  
  const commonSymbols = [
    { symbol: '\\alpha', display: 'α' },
    { symbol: '\\beta', display: 'β' },
    { symbol: '\\gamma', display: 'γ' },
    { symbol: '\\pi', display: 'π' },
    { symbol: '\\theta', display: 'θ' },
    { symbol: '\\sum', display: '∑' },
    { symbol: '\\int', display: '∫' },
    { symbol: '\\rightarrow', display: '→' },
    { symbol: '\\infty', display: '∞' },
  ];

  // In real implementation, we would use a math rendering library like KaTeX
  const renderedMath = () => {
    // Basic rendering of some common LaTeX symbols
    let rendered = latex;
    
    // Replace common LaTeX commands with basic Unicode representations for the demo
    rendered = rendered
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\gamma/g, 'γ')
      .replace(/\\delta/g, 'δ')
      .replace(/\\theta/g, 'θ')
      .replace(/\\pi/g, 'π')
      .replace(/\\sum/g, '∑')
      .replace(/\\int/g, '∫')
      .replace(/\\infty/g, '∞')
      .replace(/\\rightarrow/g, '→')
      .replace(/\\frac\{(.*?)\}\{(.*?)\}/g, '$1/$2')
      .replace(/\\sqrt\{(.*?)\}/g, '√($1)');
    
    return rendered;
  };
  
  // Handle copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      ref={containerRef}
      className={`math-renderer group relative ${display ? 'block my-4' : 'inline-block'} ${className}`}
    >
      <div 
        className={`${display ? 'py-4 px-6' : 'py-1 px-2'} rounded relative`}
        style={{
          backgroundColor: display ? `${currentTheme.colors.bgTertiary}80` : 'transparent',
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: display ? '1.1rem' : '1rem'
        }}
      >
        {display && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="text-xs px-2 py-1 rounded transition-all"
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
        
        {/* In a real implementation, we would use a proper math rendering library */}
        <div 
          className={`${display ? 'text-center' : ''} math-content`}
          style={{ 
            color: currentTheme.colors.textPrimary,
            fontStyle: 'italic'
          }}
        >
          {renderedMath()}
        </div>
        
        {display && (
          <div className="mt-2 pt-2 text-xs border-t" style={{ borderColor: `${currentTheme.colors.borderColor}40` }}>
            <div className="text-xs opacity-60 mb-1" style={{ color: currentTheme.colors.textSecondary }}>LaTeX</div>
            <code className="text-xs font-mono block py-1" style={{ color: currentTheme.colors.textMuted }}>
              {latex}
            </code>
          </div>
        )}
      </div>
    </div>
  );
};

export default MathRenderer;