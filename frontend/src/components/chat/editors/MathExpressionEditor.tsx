import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { MathTemplateType } from './types/SnippetTypes';
import { mathTemplates, allTemplates } from './data/MathTemplates';
import MathHeader from './components/MathHeader';
import MathSidebar from './components/MathSidebar';
import MathContent from './components/MathContent';
import MathTemplates from './components/MathTemplates';

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
        <MathHeader 
          currentTheme={currentTheme} 
          onClose={onClose} 
        />
        
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <MathSidebar 
            currentTheme={currentTheme}
            search={search}
            setSearch={setSearch}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            filteredTemplates={filteredTemplates}
            recentlyUsed={recentlyUsed}
            handleTemplateClick={handleTemplateClick}
            categories={Object.keys(mathTemplates)}
          />
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <MathTemplates 
              currentTheme={currentTheme}
              search={search}
              activeCategory={activeCategory}
              filteredTemplates={filteredTemplates}
              recentlyUsed={recentlyUsed}
              handleTemplateClick={handleTemplateClick}
            />
            
            <MathContent 
              currentTheme={currentTheme}
              latex={latex}
              setLatex={setLatex}
              handleInsert={handleInsert}
              handleKeyDown={handleKeyDown}
              mathInputRef={inputRef}
              onClose={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MathExpressionEditor;