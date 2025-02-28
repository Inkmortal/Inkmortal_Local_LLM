import React, { useState } from 'react';
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

  // Basic rendering to show what the math symbols would look like
  // In a real implementation, use a proper LaTeX renderer like KaTeX
  const renderLatex = () => {
    // Replace basic LaTeX with Unicode equivalents for preview
    let rendered = latex
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\gamma/g, 'γ')
      .replace(/\\delta/g, 'δ')
      .replace(/\\epsilon/g, 'ε')
      .replace(/\\zeta/g, 'ζ')
      .replace(/\\eta/g, 'η')
      .replace(/\\theta/g, 'θ')
      .replace(/\\iota/g, 'ι')
      .replace(/\\kappa/g, 'κ')
      .replace(/\\lambda/g, 'λ')
      .replace(/\\mu/g, 'μ')
      .replace(/\\nu/g, 'ν')
      .replace(/\\xi/g, 'ξ')
      .replace(/\\pi/g, 'π')
      .replace(/\\rho/g, 'ρ')
      .replace(/\\sigma/g, 'σ')
      .replace(/\\tau/g, 'τ')
      .replace(/\\upsilon/g, 'υ')
      .replace(/\\phi/g, 'φ')
      .replace(/\\chi/g, 'χ')
      .replace(/\\psi/g, 'ψ')
      .replace(/\\omega/g, 'ω')
      // Upper case Greek letters
      .replace(/\\Gamma/g, 'Γ')
      .replace(/\\Delta/g, 'Δ')
      .replace(/\\Theta/g, 'Θ')
      .replace(/\\Lambda/g, 'Λ')
      .replace(/\\Xi/g, 'Ξ')
      .replace(/\\Pi/g, 'Π')
      .replace(/\\Sigma/g, 'Σ')
      .replace(/\\Phi/g, 'Φ')
      .replace(/\\Psi/g, 'Ψ')
      .replace(/\\Omega/g, 'Ω')
      // Operations and symbols
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\cdot/g, '·')
      .replace(/\\pm/g, '±')
      .replace(/\\mp/g, '∓')
      .replace(/\\infty/g, '∞')
      .replace(/\\partial/g, '∂')
      .replace(/\\nabla/g, '∇')
      // Comparisons
      .replace(/\\neq/g, '≠')
      .replace(/\\approx/g, '≈')
      .replace(/\\equiv/g, '≡')
      .replace(/\\leq/g, '≤')
      .replace(/\\geq/g, '≥')
      // Arrows
      .replace(/\\leftarrow/g, '←')
      .replace(/\\rightarrow/g, '→')
      .replace(/\\Leftarrow/g, '⇐')
      .replace(/\\Rightarrow/g, '⇒')
      // Set operators
      .replace(/\\in/g, '∈')
      .replace(/\\notin/g, '∉')
      .replace(/\\subset/g, '⊂')
      .replace(/\\supset/g, '⊃')
      .replace(/\\cup/g, '∪')
      .replace(/\\cap/g, '∩')
      // Common functions
      .replace(/\\sum/g, '∑')
      .replace(/\\prod/g, '∏')
      .replace(/\\int/g, '∫')
      // Fractions (simplified)
      .replace(/\\frac\{(.*?)\}\{(.*?)\}/g, '$1⁄$2')
      // Square roots (simplified)
      .replace(/\\sqrt\{(.*?)\}/g, '√($1)');

    return rendered;
  };

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
          fontFamily: display ? '"Times New Roman", Times, serif' : 'inherit',
          fontSize: display ? '1.1rem' : '1rem',
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
        
        <div className={`${display ? 'text-center' : ''} math-content`} style={{ fontStyle: 'italic' }}>
          {renderLatex()}
        </div>
      </div>
    </div>
  );
};

export default MathRenderer;