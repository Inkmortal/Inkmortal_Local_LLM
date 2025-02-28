import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import Button from '../../../../components/ui/Button';

interface Formula {
  name: string;
  formula: string;
  preview?: string;
}

interface FormulaSelectorProps {
  onSelect: (formula: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const FormulaSelector: React.FC<FormulaSelectorProps> = ({
  onSelect,
  onClose,
  isOpen
}) => {
  const { currentTheme } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Common math formulas library
  const mathFormulas: Formula[] = [
    {
      name: 'Quadratic Formula',
      formula: '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
      preview: 'x = (-b ± √(b²-4ac))/(2a)'
    },
    {
      name: 'Pythagorean Theorem',
      formula: 'c = \\sqrt{a^2 + b^2}',
      preview: 'c = √(a²+b²)'
    },
    {
      name: 'Euler\'s Identity',
      formula: 'e^{i\\pi} + 1 = 0',
      preview: 'eⁱᵖⁱ + 1 = 0'
    },
    {
      name: 'Calculus Derivative',
      formula: '\\frac{d}{dx}[f(x)]',
      preview: 'd/dx[f(x)]'
    },
    {
      name: 'Matrix',
      formula: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}',
      preview: '| a b |'
    },
    {
      name: 'Integral',
      formula: '\\int_{a}^{b} f(x) \\, dx',
      preview: '∫ f(x) dx'
    },
    {
      name: 'Limit',
      formula: '\\lim_{x \\to a} f(x)',
      preview: 'lim f(x) as x→a'
    },
    {
      name: 'Sum',
      formula: '\\sum_{i=1}^{n} x_i',
      preview: '∑ xᵢ'
    },
    {
      name: 'Product',
      formula: '\\prod_{i=1}^{n} x_i',
      preview: '∏ xᵢ'
    }
  ];

  // Handle clicks outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % mathFormulas.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + mathFormulas.length) % mathFormulas.length);
          break;
        case 'Enter':
          e.preventDefault();
          onSelect(mathFormulas[selectedIndex].formula);
          onClose();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onSelect, selectedIndex, mathFormulas]);

  if (!isOpen) return null;

  return (
    <div 
      className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-50"
      style={{
        maxWidth: '350px',
        width: '90%'
      }}
    >
      <div 
        ref={containerRef}
        className="rounded-lg shadow-xl overflow-hidden"
        style={{
          backgroundColor: currentTheme.colors.bgSecondary,
          border: `1px solid ${currentTheme.colors.borderColor}`,
          boxShadow: `0 6px 16px rgba(0, 0, 0, 0.12), 0 3px 6px rgba(0, 0, 0, 0.08)`
        }}
      >
        <div 
          className="px-4 py-2 font-medium border-b"
          style={{
            borderColor: currentTheme.colors.borderColor,
            color: currentTheme.colors.textPrimary,
            backgroundColor: `${currentTheme.colors.accentPrimary}10`
          }}
        >
          Insert Math Formula
        </div>
        
        <div 
          className="max-h-60 overflow-y-auto modern-scrollbar"
          style={{ color: currentTheme.colors.textPrimary }}
        >
          {mathFormulas.map((formula, index) => (
            <div
              key={formula.name}
              className={`px-4 py-2 cursor-pointer hover:bg-opacity-70 transition-colors ${
                selectedIndex === index ? 'bg-opacity-100' : 'bg-opacity-0'
              }`}
              style={{
                backgroundColor: selectedIndex === index 
                  ? `${currentTheme.colors.accentPrimary}15` 
                  : 'transparent',
                borderLeft: selectedIndex === index 
                  ? `2px solid ${currentTheme.colors.accentPrimary}` 
                  : '2px solid transparent'
              }}
              onClick={() => {
                onSelect(formula.formula);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="font-medium text-sm">{formula.name}</div>
              <div 
                className="text-xs font-mono mt-1"
                style={{ color: currentTheme.colors.textSecondary }}
              >
                {formula.preview}
              </div>
            </div>
          ))}
        </div>
        
        <div 
          className="px-4 py-2 border-t flex justify-end gap-2"
          style={{ borderColor: currentTheme.colors.borderColor }}
        >
          <Button 
            size="sm" 
            variant="ghost"
            onClick={onClose}
            style={{ color: currentTheme.colors.textSecondary }}
          >
            Cancel
          </Button>
          <Button 
            size="sm"
            onClick={() => {
              onSelect(mathFormulas[selectedIndex].formula);
              onClose();
            }}
            style={{
              background: `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
              color: '#fff'
            }}
          >
            Insert
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FormulaSelector;