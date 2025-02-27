import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

declare global {
  interface Window {
    Prism: any;
  }
}

const CodeBlock: React.FC<CodeBlockProps> = ({ 
  code, 
  language = 'javascript',
  className = '' 
}) => {
  const { currentTheme } = useTheme();
  const [highlighted, setHighlighted] = useState<string>('');

  useEffect(() => {
    // Load Prism.js for syntax highlighting if it's not already loaded
    if (!window.Prism) {
      const prismCss = document.createElement('link');
      prismCss.rel = 'stylesheet';
      prismCss.href = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css';
      document.head.appendChild(prismCss);
      
      const prismScript = document.createElement('script');
      prismScript.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js';
      prismScript.async = true;
      
      // Load common language components
      const loadLanguages = () => {
        ['javascript', 'python', 'java', 'c', 'cpp', 'csharp', 'html', 'css', 'bash'].forEach(lang => {
          const langScript = document.createElement('script');
          langScript.src = `https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-${lang}.min.js`;
          langScript.async = true;
          document.head.appendChild(langScript);
        });
        
        // After a small delay to let languages load, highlight the code
        setTimeout(() => {
          highlightCode();
        }, 300);
      };
      
      prismScript.onload = loadLanguages;
      document.head.appendChild(prismScript);
    } else {
      highlightCode();
    }
  }, [code, language]);

  const highlightCode = () => {
    if (window.Prism) {
      try {
        const grammar = window.Prism.languages[language] || window.Prism.languages.javascript;
        const highlightedCode = window.Prism.highlight(code, grammar, language);
        setHighlighted(highlightedCode);
      } catch (error) {
        console.error('Error highlighting code:', error);
        setHighlighted(code);
      }
    } else {
      setHighlighted(code);
    }
  };

  return (
    <div 
      className={`rounded-md overflow-hidden ${className}`}
      style={{ backgroundColor: '#282c34' }} // Dark background for code
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
      <pre className="p-4 overflow-x-auto" style={{ margin: 0 }}>
        <code 
          className={`language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlighted || code }}
        />
      </pre>
    </div>
  );
};

export default CodeBlock;