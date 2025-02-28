import React, { useState, useRef, useEffect } from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import CodeBlock from '../../../education/CodeBlock';
import { useTheme } from '../../../../context/ThemeContext';

const CodeNodeView: React.FC<NodeViewProps> = ({
  node,
  editor,
  getPos,
  updateAttributes
}) => {
  const { currentTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [code, setCode] = useState(node.textContent);
  const [language, setLanguage] = useState(node.attrs.language || 'javascript');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update local state when node content changes externally
  useEffect(() => {
    setCode(node.textContent);
    setLanguage(node.attrs.language || 'javascript');
  }, [node.textContent, node.attrs.language]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const toggleMode = () => {
    setIsEditing(!isEditing);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
    if (typeof updateAttributes === 'function') {
      updateAttributes({ language: e.target.value });
    }
  };

  const handleBlur = () => {
    // When user leaves the textarea, update the node content
    if (typeof getPos === 'function') {
      const pos = getPos();
      const transaction = editor.state.tr.insertText(code, pos + 1, pos + node.nodeSize - 1);
      editor.view.dispatch(transaction);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      // Ctrl/Cmd+Enter to save and exit edit mode
      e.preventDefault();
      if (textareaRef.current) {
        textareaRef.current.blur();
      }
      setIsEditing(false);
    }
    
    // Tab key should insert spaces instead of moving focus
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const { selectionStart, selectionEnd } = target;
      const newCode = 
        code.substring(0, selectionStart) + 
        '  ' + 
        code.substring(selectionEnd);
      
      setCode(newCode);
      
      // Set cursor position after the inserted tab
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = selectionStart + 2;
          textareaRef.current.selectionEnd = selectionStart + 2;
        }
      }, 0);
    }
  };

  // Available language options
  const languageOptions = [
    'javascript', 'typescript', 'html', 'css', 'python', 
    'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'ruby', 
    'php', 'swift', 'kotlin', 'sql', 'bash', 'json', 'xml'
  ];
  
  return (
    <NodeViewWrapper className="code-block-wrapper">
      <div
        className="code-block relative group my-2 rounded-md overflow-hidden"
        style={{
          backgroundColor: `#282c34`,
          border: `1px solid ${currentTheme.colors.borderColor}40`,
        }}
      >
        {/* Edit/View toggle button */}
        <button
          type="button"
          onClick={toggleMode}
          className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20"
          style={{
            backgroundColor: `rgba(40, 44, 52, 0.7)`,
            color: '#aab1c0',
          }}
          title={isEditing ? "View rendered code" : "Edit code"}
        >
          {isEditing ? (
            // Eye icon for view mode
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            // Edit icon for edit mode
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )}
        </button>

        {isEditing ? (
          <div>
            {/* Language selector header */}
            <div className="flex items-center justify-between px-4 py-2 text-xs" style={{ backgroundColor: '#21252b' }}>
              <select
                value={language}
                onChange={handleLanguageChange}
                className="bg-transparent text-gray-300 border border-gray-700 rounded px-1 py-0.5"
              >
                {languageOptions.map(lang => (
                  <option key={lang} value={lang} style={{ backgroundColor: '#282c34', color: '#aab1c0' }}>
                    {lang}
                  </option>
                ))}
              </select>
              <span className="text-xs" style={{ color: '#aab1c0' }}>
                <kbd className="px-1 py-0.5 rounded text-[10px] mx-0.5" style={{ backgroundColor: '#21252b', color: '#aab1c0', border: '1px solid #4b5263' }}>
                  {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter
                </kbd> to save
              </span>
            </div>
            
            {/* Code editor textarea */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={handleCodeChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full p-4 font-mono text-sm"
              style={{
                backgroundColor: '#282c34',
                color: '#abb2bf',
                minHeight: '100px',
                outline: 'none',
                resize: 'vertical',
                lineHeight: 1.5,
              }}
              placeholder={`Enter ${language} code...`}
            />
          </div>
        ) : (
          <CodeBlock code={code} language={language} />
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default CodeNodeView;