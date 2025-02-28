import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { MathTemplateType } from './types/SnippetTypes';
import { mathTemplates, allTemplates } from './data/MathTemplates';
import MathRenderer from '../../education/MathRenderer';

interface MathExpressionEditorProps {
  onInsert: (latex: string) => void;
  onClose: () => void;
  initialLatex?: string;
}

const MathExpressionEditor: React.FC<MathExpressionEditorProps> = ({
  onInsert,
  onClose,
  initialLatex = '',
}) => {
  const { currentTheme } = useTheme();
  const [latex, setLatex] = useState(initialLatex);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>('Basic Math');
  const [filteredTemplates, setFilteredTemplates] = useState(allTemplates);
  const [recentlyUsed, setRecentlyUsed] = useState<MathTemplateType[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Handle searching and filtering
  useEffect(() => {
    if (search) {
      const results = allTemplates.filter(
        template => 
          template.name.toLowerCase().includes(search.toLowerCase()) || 
          template.description.toLowerCase().includes(search.toLowerCase()) ||
          template.latex.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredTemplates(results);
      setActiveCategory(null);
    } else if (activeCategory) {
      setFilteredTemplates(mathTemplates[activeCategory as keyof typeof mathTemplates] || []);
    } else {
      setFilteredTemplates(allTemplates);
    }
  }, [search, activeCategory]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Get recently used templates from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentMathTemplates');
      if (saved) {
        setRecentlyUsed(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load recent math templates', e);
    }
  }, []);

  const handleTemplateClick = (template: MathTemplateType) => {
    // Append the template to the current input or replace if empty
    if (latex && inputRef.current) {
      // Get cursor position
      const cursorPos = inputRef.current.selectionStart;
      const textBefore = latex.substring(0, cursorPos);
      const textAfter = latex.substring(cursorPos);
      
      // Insert at cursor position
      setLatex(textBefore + template.latex + textAfter);
      
      // Calculate new cursor position after the inserted template
      const newCursorPos = cursorPos + template.latex.length;
      
      // Set cursor position after the inserted template
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    } else {
      setLatex(template.latex);
      // Focus with cursor at the end
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(template.latex.length, template.latex.length);
        }
      }, 0);
    }

    // Update recently used
    const updatedRecent = [template, ...recentlyUsed.filter(t => t.latex !== template.latex)].slice(0, 5);
    setRecentlyUsed(updatedRecent);
    try {
      localStorage.setItem('recentMathTemplates', JSON.stringify(updatedRecent));
    } catch (e) {
      console.error('Failed to save recent math templates', e);
    }
  };

  const handleInsert = () => {
    if (latex.trim()) {
      onInsert(latex.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Insert on Ctrl+Enter or Command+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleInsert();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-xl overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col"
        style={{ 
          backgroundColor: currentTheme.colors.bgSecondary,
          boxShadow: `0 10px 25px rgba(0,0,0,0.2)`,
          border: `1px solid ${currentTheme.colors.borderColor}40`
        }}
      >
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center"
          style={{ borderColor: `${currentTheme.colors.borderColor}40` }}
        >
          <h3 className="text-lg font-medium" style={{ color: currentTheme.colors.textPrimary }}>
            Math Expression Editor
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full"
            style={{ 
              color: currentTheme.colors.textSecondary,
              backgroundColor: `${currentTheme.colors.bgTertiary}00`
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Sidebar with Categories */}
          <div className="w-full md:w-64 flex flex-col border-r" 
            style={{ borderColor: `${currentTheme.colors.borderColor}40` }}
          >
            {/* Search */}
            <div className="p-2 border-b" style={{ borderColor: `${currentTheme.colors.borderColor}40` }}>
              <input
                type="text"
                placeholder="Search expressions..."
                className="w-full px-3 py-2 rounded-md"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ 
                  backgroundColor: currentTheme.colors.bgPrimary,
                  color: currentTheme.colors.textPrimary,
                  border: `1px solid ${currentTheme.colors.borderColor}40`
                }}
              />
            </div>
            
            {/* Categories */}
            <div className="overflow-y-auto flex-1">
              <div className="p-2">
                <div className="text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{ color: currentTheme.colors.textMuted }}
                >
                  Categories
                </div>
                
                {Object.keys(mathTemplates).map(category => (
                  <button
                    key={category}
                    onClick={() => {
                      setActiveCategory(category);
                      setSearch('');
                    }}
                    className={`block w-full text-left px-3 py-2 rounded-md mb-1 text-sm ${
                      activeCategory === category ? 'font-medium' : ''
                    }`}
                    style={{ 
                      backgroundColor: activeCategory === category 
                        ? `${currentTheme.colors.accentPrimary}15` 
                        : 'transparent',
                      color: activeCategory === category
                        ? currentTheme.colors.accentPrimary
                        : currentTheme.colors.textPrimary
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Templates Display */}
            <div className="p-3 border-b overflow-y-auto max-h-48"
              style={{ borderColor: `${currentTheme.colors.borderColor}40` }}
            >
              {/* Show category name or search results */}
              <div className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: currentTheme.colors.textMuted }}
              >
                {search ? 'Search Results' : activeCategory || 'All Templates'}
              </div>
              
              {recentlyUsed.length > 0 && !search && !activeCategory && (
                <div className="mb-3">
                  <div className="text-xs font-medium mb-1"
                    style={{ color: currentTheme.colors.textMuted }}
                  >
                    Recently Used
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentlyUsed.map((template, index) => (
                      <button
                        key={`recent-${index}`}
                        onClick={() => handleTemplateClick(template)}
                        className="px-3 py-2 rounded-md text-sm flex items-center"
                        style={{ 
                          backgroundColor: `${currentTheme.colors.bgTertiary}40`,
                          color: currentTheme.colors.textPrimary,
                          border: `1px solid ${currentTheme.colors.borderColor}40`
                        }}
                      >
                        <MathRenderer latex={template.latex} display={false} className="mx-1" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Templates grid */}
              <div className="grid grid-cols-2 gap-2">
                {filteredTemplates.length === 0 ? (
                  <div className="col-span-2 text-center py-4"
                    style={{ color: currentTheme.colors.textMuted }}
                  >
                    No expressions found
                  </div>
                ) : (
                  filteredTemplates.map((template, index) => (
                    <button
                      key={`template-${index}`}
                      onClick={() => handleTemplateClick(template)}
                      className="flex flex-col p-2 rounded-md hover:bg-opacity-10 text-left"
                      style={{ 
                        backgroundColor: `${currentTheme.colors.bgTertiary}20`,
                        border: `1px solid ${currentTheme.colors.borderColor}30`,
                        color: currentTheme.colors.textPrimary
                      }}
                    >
                      <div className="flex-1 flex items-center justify-center py-2">
                        <MathRenderer latex={template.latex} display={true} />
                      </div>
                      <div className="mt-1 text-xs font-medium"
                        style={{ color: currentTheme.colors.textSecondary }}
                      >
                        {template.name}
                      </div>
                      <div className="text-xs truncate"
                        style={{ color: currentTheme.colors.textMuted }}
                      >
                        {template.description}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
            
            {/* LaTeX input */}
            <div className="p-3 border-b" style={{ borderColor: `${currentTheme.colors.borderColor}40` }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: currentTheme.colors.textMuted }}
              >
                LaTeX Expression
              </div>
              <textarea
                ref={inputRef}
                value={latex}
                onChange={e => setLatex(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full p-3 min-h-[120px] max-h-[150px] rounded-md mb-3 font-mono text-sm"
                style={{ 
                  backgroundColor: currentTheme.colors.bgPrimary,
                  color: currentTheme.colors.textPrimary,
                  border: `1px solid ${currentTheme.colors.borderColor}40`
                }}
                placeholder="\sum_{i=1}^{n} i^2 = \frac{n(n+1)(2n+1)}{6}"
              />
            </div>
            
            {/* Preview */}
            <div className="flex-1 p-3 overflow-y-auto">
              <div className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: currentTheme.colors.textMuted }}
              >
                Preview
              </div>
              <div 
                className="flex items-center justify-center p-4 rounded-md"
                style={{ 
                  backgroundColor: `${currentTheme.colors.bgTertiary}20`,
                  border: `1px solid ${currentTheme.colors.borderColor}40`,
                  minHeight: '100px'
                }}
              >
                {latex ? (
                  <MathRenderer latex={latex} display={true} />
                ) : (
                  <span className="text-sm italic" style={{ color: currentTheme.colors.textMuted }}>
                    Enter a LaTeX expression or select a template to see a preview
                  </span>
                )}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="p-3 border-t flex justify-between"
              style={{ borderColor: `${currentTheme.colors.borderColor}40` }}
            >
              <div className="text-xs flex items-center"
                style={{ color: currentTheme.colors.textMuted }}
              >
                <span className="hidden md:inline">Tip: Press</span>
                <kbd className="px-1.5 py-0.5 rounded text-[10px] mx-1"
                  style={{
                    backgroundColor: `${currentTheme.colors.bgTertiary}80`,
                    color: currentTheme.colors.textSecondary,
                    border: `1px solid ${currentTheme.colors.borderColor}40`,
                  }}
                >
                  {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter
                </kbd>
                <span className="hidden md:inline">to insert</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-md"
                  style={{ 
                    backgroundColor: `${currentTheme.colors.bgTertiary}40`,
                    color: currentTheme.colors.textSecondary
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleInsert}
                  className="px-4 py-2 rounded-md"
                  style={{ 
                    background: `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
                    color: '#fff'
                  }}
                >
                  Insert Expression
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MathExpressionEditor;