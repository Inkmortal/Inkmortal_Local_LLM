import React, { useEffect, useRef } from 'react';

interface MathRendererProps {
  latex: string;
  display?: boolean;
  className?: string;
}

declare global {
  interface Window {
    MathJax: any;
  }
}

const MathRenderer: React.FC<MathRendererProps> = ({ 
  latex, 
  display = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure MathJax is loaded
    if (!window.MathJax) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
      script.async = true;
      script.onload = () => {
        window.MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['\\(', '\\)']],
            displayMath: [['$$', '$$'], ['\\[', '\\]']],
            processEscapes: true,
          },
          svg: {
            fontCache: 'global'
          },
          options: {
            enableMenu: false
          }
        };
        renderMath();
      };
      document.head.appendChild(script);
    } else {
      renderMath();
    }
  }, [latex]);

  const renderMath = () => {
    if (containerRef.current && window.MathJax?.typesetPromise) {
      // Format the LaTeX based on display mode
      const formattedLatex = display 
        ? `$$${latex}$$` 
        : `$${latex}$`;
      
      containerRef.current.innerHTML = formattedLatex;
      
      // Render with MathJax
      window.MathJax.typesetPromise([containerRef.current])
        .catch((err: any) => console.error('MathJax error:', err));
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`math-renderer ${display ? 'my-2 text-center' : 'inline'} ${className}`}
    />
  );
};

export default MathRenderer;