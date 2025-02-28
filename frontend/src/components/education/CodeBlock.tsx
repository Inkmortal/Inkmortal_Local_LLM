import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';

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
  
  useEffect(() => {
    Prism.highlightAll();
  }, [code, language]);

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
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
      }}
    >
      <div className="flex justify-between items-center px-4 py-2 text-xs" style={{ backgroundColor: '#21252b' }}>
        <div className="flex items-center">
          <div className="flex space-x-1.5 mr-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
          </div>
          <span style={{ color: '#aab1c0' }}>{language}</span>
        </div>
        <button
          className="text-xs px-2 py-1 rounded transition-colors"
          style={{ 
            backgroundColor: copied ? `${currentTheme.colors.accentSecondary}20` : `${currentTheme.colors.accentPrimary}20`,
            color: copied ? currentTheme.colors.accentSecondary : currentTheme.colors.accentPrimary 
          }}
          onClick={handleCopy}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre 
        className="p-4 overflow-x-auto text-sm font-mono leading-relaxed" 
        style={{ 
          margin: 0, 
          backgroundColor: '#282c34',
          maxHeight: '400px'
        }}
      >
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;