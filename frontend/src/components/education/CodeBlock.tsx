import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

// Simple placeholder for CodeBlock until proper implementation
const CodeBlock: React.FC<CodeBlockProps> = ({ 
  code, 
  language = 'javascript',
  className = '' 
}) => {
  const { currentTheme } = useTheme();

  return (
    <div 
      className={`rounded-md overflow-hidden ${className}`}
      style={{ backgroundColor: '#282c34' }}
    >
      <div className="flex justify-between items-center px-4 py-2 text-xs" style={{ backgroundColor: '#21252b' }}>
        <span style={{ color: '#aab1c0' }}>{language}</span>
        <button
          className="text-xs px-2 py-1 rounded"
          style={{ 
            backgroundColor: `${currentTheme.colors.accentPrimary}20`,
            color: currentTheme.colors.accentPrimary
          }}
          onClick={() => {
            navigator.clipboard.writeText(code);
          }}
        >
          Copy
        </button>
      </div>
      <pre className="p-4 overflow-x-auto" style={{ margin: 0, color: '#abb2bf' }}>
        <code>
          {code}
        </code>
      </pre>
    </div>
  );
};

export default CodeBlock;