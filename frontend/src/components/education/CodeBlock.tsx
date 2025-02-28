import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ 
  code, 
  language = 'javascript',
  className = '' 
}) => {
  const { currentTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  // Apply syntax highlighting colors based on language
  const getHighlightedCode = () => {
    if (!code) return '';
    
    // This is a simple syntax highlighter that uses regex.
    // In production, you should use a proper syntax highlighting library.
    let highlightedCode = code;
    
    const stringPattern = /(["'`])(.*?)\1/g;
    const keywordPattern = /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|new|this)\b/g;
    const commentPattern = /(\/\/.*|\/\*[\s\S]*?\*\/)/g;
    const numberPattern = /\b(\d+(\.\d+)?)\b/g;
    
    // Replace patterns with colored spans
    highlightedCode = highlightedCode
      .replace(stringPattern, '<span style="color: #98c379;">$&</span>')
      .replace(keywordPattern, '<span style="color: #c678dd;">$&</span>')
      .replace(commentPattern, '<span style="color: #7f848e;">$&</span>')
      .replace(numberPattern, '<span style="color: #d19a66;">$&</span>');
    
    return highlightedCode;
  };

  // Handle copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className={`rounded-md overflow-hidden ${className}`}
      style={{ 
        backgroundColor: '#282c34',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}
    >
      <div className="flex justify-between items-center px-4 py-2 text-xs" style={{ backgroundColor: '#21252b' }}>
        <div className="flex items-center">
          <div className="flex space-x-1.5 mr-3">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span style={{ color: '#aab1c0' }}>{language}</span>
        </div>
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
      <pre 
        className="p-4 overflow-x-auto text-sm leading-6" 
        style={{ margin: 0, color: '#abb2bf', fontFamily: 'Menlo, Monaco, Consolas, monospace' }}
      >
        <code dangerouslySetInnerHTML={{ __html: getHighlightedCode() }}></code>
      </pre>
    </div>
  );
};

export default CodeBlock;