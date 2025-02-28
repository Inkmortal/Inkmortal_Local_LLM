import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { CodeSnippetType } from './types/SnippetTypes';
import { codeSnippets, allSnippets } from './data/CodeSnippets';
import { languageOptions } from './data/LanguageOptions';
import CodeEditorHeader from './components/CodeEditorHeader';
import CodeEditorSidebar from './components/CodeEditorSidebar';
import CodeEditorMain from './components/CodeEditorMain';

interface CodeEditorProps {
  onInsert: (code: string, language: string) => void;
  onClose: () => void;
  initialCode?: string;
  initialLanguage?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  onInsert,
  onClose,
  initialCode = '',
  initialLanguage = 'javascript',
}) => {
  const { currentTheme } = useTheme();
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage);
  const [search, setSearch] = useState('');
  const [filteredSnippets, setFilteredSnippets] = useState<CodeSnippetType[]>(
    codeSnippets[language as keyof typeof codeSnippets] || []
  );
  const [recentlyUsed, setRecentlyUsed] = useState<Array<CodeSnippetType & { language: string }>>([]);
  const codeInputRef = useRef<HTMLTextAreaElement>(null);

  // Update snippets when language changes
  useEffect(() => {
    if (!search) {
      setFilteredSnippets(codeSnippets[language as keyof typeof codeSnippets] || []);
    }
  }, [language, search]);

  // Filter snippets based on search
  useEffect(() => {
    if (search) {
      const results = allSnippets.filter(
        snippet => 
          snippet.name.toLowerCase().includes(search.toLowerCase()) || 
          snippet.description.toLowerCase().includes(search.toLowerCase()) ||
          snippet.code.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredSnippets(results);
    } else {
      setFilteredSnippets(codeSnippets[language as keyof typeof codeSnippets] || []);
    }
  }, [search, language]);

  // Focus input on mount
  useEffect(() => {
    if (codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, []);

  // Get recently used snippets from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentCodeSnippets');
      if (saved) {
        setRecentlyUsed(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load recent code snippets', e);
    }
  }, []);

  const handleSnippetClick = (snippet: CodeSnippetType & { language?: string }) => {
    // Automatically change the language if a snippet from another language is selected
    if (snippet.language && snippet.language !== language) {
      setLanguage(snippet.language);
    }
    
    // Append the snippet to the current input or replace if empty
    if (code && codeInputRef.current) {
      // Get cursor position
      const cursorPos = codeInputRef.current.selectionStart;
      const textBefore = code.substring(0, cursorPos);
      const textAfter = code.substring(cursorPos);
      
      // Insert at cursor position
      setCode(textBefore + snippet.code + textAfter);
      
      // Calculate new cursor position after the inserted snippet
      const newCursorPos = cursorPos + snippet.code.length;
      
      // Set cursor position after the inserted snippet
      setTimeout(() => {
        if (codeInputRef.current) {
          codeInputRef.current.focus();
          codeInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    } else {
      setCode(snippet.code);
      // Focus with cursor at the end
      setTimeout(() => {
        if (codeInputRef.current) {
          codeInputRef.current.focus();
          codeInputRef.current.setSelectionRange(snippet.code.length, snippet.code.length);
        }
      }, 0);
    }

    // Update recently used
    const updatedRecent = [
      { ...snippet, language: snippet.language || language }, 
      ...recentlyUsed.filter(s => s.code !== snippet.code)
    ].slice(0, 5);
    
    setRecentlyUsed(updatedRecent);
    try {
      localStorage.setItem('recentCodeSnippets', JSON.stringify(updatedRecent));
    } catch (e) {
      console.error('Failed to save recent code snippets', e);
    }
  };

  const handleInsert = () => {
    if (code.trim()) {
      onInsert(code.trim(), language);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Insert on Ctrl+Enter or Command+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleInsert();
    }
    
    // Handle tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const cursorPos = codeInputRef.current?.selectionStart || 0;
      const textBefore = code.substring(0, cursorPos);
      const textAfter = code.substring(cursorPos);
      
      // Insert two spaces for indentation
      setCode(textBefore + '  ' + textAfter);
      
      // Move cursor position
      setTimeout(() => {
        if (codeInputRef.current) {
          codeInputRef.current.selectionStart = cursorPos + 2;
          codeInputRef.current.selectionEnd = cursorPos + 2;
        }
      }, 0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col"
        style={{ 
          backgroundColor: currentTheme.colors.bgSecondary,
          boxShadow: `0 10px 25px rgba(0,0,0,0.2)`,
          border: `1px solid ${currentTheme.colors.borderColor}40`
        }}
      >
        <CodeEditorHeader 
          currentTheme={currentTheme} 
          onClose={onClose} 
        />
        
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <CodeEditorSidebar 
            currentTheme={currentTheme}
            language={language}
            setLanguage={setLanguage}
            search={search}
            setSearch={setSearch}
            filteredSnippets={filteredSnippets}
            recentlyUsed={recentlyUsed}
            handleSnippetClick={handleSnippetClick}
          />
          
          <CodeEditorMain
            currentTheme={currentTheme}
            code={code}
            setCode={setCode}
            language={language}
            handleKeyDown={handleKeyDown}
            codeInputRef={codeInputRef}
            onClose={onClose}
            handleInsert={handleInsert}
          />
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;