import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import CodeBlock from '../education/CodeBlock';
import MathRenderer from '../education/MathRenderer';
import 'katex/dist/katex.min.css';
import '../../styles/markdown.css';

interface MarkdownRendererProps {
  markdown: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdown }) => {
  const { currentTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Process code blocks with Prism
    if (window.Prism) {
      containerRef.current.querySelectorAll('pre code').forEach((block) => {
        window.Prism.highlightElement(block);
      });
    }
    
    // Process math with KaTeX
    const katexRender = window.renderMathInElement;
    if (katexRender) {
      try {
        katexRender(containerRef.current, {
          delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "$", right: "$", display: false}
          ],
          throwOnError: false
        });
      } catch (e) {
        console.error('KaTeX rendering error:', e);
      }
    }
  }, [markdown]);

  return (
    <div className="markdown-content" ref={containerRef}>
      <style jsx>{`
        .markdown-content {
          color: ${currentTheme.colors.textPrimary};
          font-size: 1rem;
          line-height: 1.6;
        }
        .markdown-content h1 {
          font-size: 2em;
          font-weight: 600;
          margin: 0.67em 0;
          color: ${currentTheme.colors.accentPrimary};
        }
        .markdown-content h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin: 0.83em 0;
          color: ${currentTheme.colors.accentPrimary};
        }
        .markdown-content h3 {
          font-size: 1.17em;
          font-weight: 600;
          margin: 1em 0;
          color: ${currentTheme.colors.accentPrimary};
        }
        .markdown-content p {
          margin: 1em 0;
        }
        .markdown-content strong {
          font-weight: 600;
        }
        .markdown-content em {
          font-style: italic;
        }
        .markdown-content ul, .markdown-content ol {
          margin: 1em 0;
          padding-left: 2em;
        }
        .markdown-content ul {
          list-style-type: disc;
        }
        .markdown-content ol {
          list-style-type: decimal;
        }
        .markdown-content li {
          margin: 0.5em 0;
        }
        .markdown-content code {
          font-family: monospace;
          background-color: ${currentTheme.colors.bgTertiary}80;
          padding: 0.2em 0.4em;
          border-radius: 3px;
        }
        .markdown-content pre {
          background-color: ${currentTheme.colors.bgTertiary}80;
          padding: 1em;
          border-radius: 5px;
          overflow-x: auto;
          margin: 1em 0;
        }
        .markdown-content pre code {
          background-color: transparent;
          padding: 0;
        }
      `}</style>
      {markdown}
    </div>
  );
};

export default MarkdownRenderer;