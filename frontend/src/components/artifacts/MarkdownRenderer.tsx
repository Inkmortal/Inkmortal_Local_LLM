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
  
  // After rendering, update math expressions with KaTeX and code blocks with Prism
  useEffect(() => {
    if (containerRef.current) {
      // Process code blocks with Prism
      if (window.Prism) {
        containerRef.current.querySelectorAll('pre code').forEach((block) => {
          window.Prism.highlightElement(block);
        });
      }
      
      // Process math expressions with KaTeX
      if (window.renderMathInElement) {
        window.renderMathInElement(containerRef.current, {
          delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "$", right: "$", display: false}
          ]
        });
      }
    }
  }, [markdown]);

  // Process the markdown for rendering
  const processMarkdown = () => {
    // Replace math expressions
    const processedText = markdown
      // Handle code blocks
      .replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<div class="code-block" data-language="${lang || 'plaintext'}">${code}</div>`;
      })
      // Handle inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Handle headers
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
      // Handle bold and italic
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      // Handle lists
      .replace(/^\s*[\-\*] (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>')
      .replace(/^\s*\d+\. (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>\d+\. .*<\/li>\n)+/g, '<ol>$&</ol>')
      // Handle paragraphs (after all other elements)
      .replace(/^(?!<[a-z]).+/gm, '<p>$&</p>')
      // Handle line breaks
      .replace(/\n\n/g, '</p><p>')
      // Clean up empty paragraphs
      .replace(/<p><\/p>/g, '')
      // Math expressions (leave them for later processing by KaTeX)
      .replace(/\$\$(.*?)\$\$/g, '<div class="math-display">$$$$</div>')
      .replace(/\$(.*?)\$/g, '<span class="math-inline">$$</span>');

    return processedText;
  };

  // Custom render function to handle code blocks and math
  const renderHtml = () => {
    const processedText = processMarkdown();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = processedText;

    // Process code blocks
    const codeBlocks = tempDiv.querySelectorAll('.code-block');
    codeBlocks.forEach((block) => {
      const language = block.getAttribute('data-language') || 'plaintext';
      const code = block.textContent || '';
      const codeBlockElement = document.createElement('div');
      codeBlockElement.className = 'markdown-code-block';
      codeBlockElement.innerHTML = `<pre><code class="language-${language}">${code}</code></pre>`;
      block.replaceWith(codeBlockElement);
    });

    // Process math expressions
    const mathDisplayBlocks = tempDiv.querySelectorAll('.math-display');
    mathDisplayBlocks.forEach((block) => {
      const latex = block.textContent?.replace(/\$\$/g, '') || '';
      const mathElement = document.createElement('div');
      mathElement.className = 'markdown-math-display';
      mathElement.setAttribute('data-latex', latex);
      block.replaceWith(mathElement);
    });

    const mathInlineBlocks = tempDiv.querySelectorAll('.math-inline');
    mathInlineBlocks.forEach((block) => {
      const latex = block.textContent?.replace(/\$/g, '') || '';
      const mathElement = document.createElement('span');
      mathElement.className = 'markdown-math-inline';
      mathElement.setAttribute('data-latex', latex);
      block.replaceWith(mathElement);
    });

    return tempDiv.innerHTML;
  };

  // For the real markdown rendering
  const renderMarkdown = () => {
    const html = renderHtml();
    
    return (
      <div 
        className="markdown-renderer"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  return (
    <div 
      ref={containerRef}
      className="markdown-container prose prose-sm max-w-none" 
      style={{
        color: currentTheme.colors.textPrimary,
        '--tw-prose-headings': currentTheme.colors.accentPrimary,
        '--tw-prose-links': currentTheme.colors.accentSecondary,
        '--tw-prose-code': currentTheme.colors.textPrimary,
        '--tw-prose-pre-bg': `${currentTheme.colors.bgTertiary}80`,
      } as React.CSSProperties}
    >
      {renderMarkdown()}
    </div>
  );
};

export default MarkdownRenderer;