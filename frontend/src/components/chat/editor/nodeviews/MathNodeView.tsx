import React, { useState, useRef, useEffect } from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import MathRenderer from '../../../education/MathRenderer';
import { useTheme } from '../../../../context/ThemeContext';

const MathNodeView: React.FC<NodeViewProps> = ({ 
  node, 
  editor,
  getPos,
  updateAttributes 
}) => {
  const { currentTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [latex, setLatex] = useState(node.textContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update local state when node content changes externally
  useEffect(() => {
    setLatex(node.textContent);
  }, [node.textContent]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const toggleMode = () => {
    setIsEditing(!isEditing);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLatex(e.target.value);
  };

  const handleBlur = () => {
    // When user leaves the textarea, update the node content
    if (typeof getPos === 'function') {
      const pos = getPos();
      const transaction = editor.state.tr.insertText(latex, pos, pos + node.nodeSize - 1);
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
  };

  return (
    <NodeViewWrapper className="math-block-wrapper">
      <div
        className="math-block relative group my-2 rounded-md overflow-hidden"
        style={{
          backgroundColor: `${currentTheme.colors.bgTertiary}30`,
          border: `1px solid ${currentTheme.colors.borderColor}40`,
        }}
      >
        {/* Header bar with label and toggle button */}
        <div 
          className="flex justify-between items-center px-3 py-1.5 border-b"
          style={{ 
            borderColor: `${currentTheme.colors.borderColor}40`,
            backgroundColor: `${currentTheme.colors.bgTertiary}30`
          }}
        >
          <span className="text-xs font-medium" style={{ color: currentTheme.colors.textMuted }}>
            {isEditing ? "Editing LaTeX" : "Math Expression"}
          </span>
          <button
            type="button"
            onClick={toggleMode}
            className="p-1 rounded opacity-80 hover:opacity-100 transition-opacity"
            style={{
              backgroundColor: `${currentTheme.colors.bgTertiary}70`,
              color: currentTheme.colors.textSecondary,
            }}
            title={isEditing ? "View rendered math" : "Edit LaTeX"}
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
        </div>

        {isEditing ? (
          <div className="p-2">
            <textarea
              ref={textareaRef}
              value={latex}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full p-2 min-h-[60px] font-mono text-sm"
              style={{
                backgroundColor: `${currentTheme.colors.bgPrimary}`,
                color: currentTheme.colors.textPrimary,
                border: `1px solid ${currentTheme.colors.borderColor}40`,
                borderRadius: '0.25rem',
                outline: 'none',
              }}
              placeholder="Enter LaTeX expression..."
            />
            <div className="text-xs mt-1 text-right" style={{ color: currentTheme.colors.textMuted }}>
              Press <kbd className="px-1 py-0.5 rounded text-[10px] mx-0.5" style={{ backgroundColor: `${currentTheme.colors.bgTertiary}`, color: currentTheme.colors.textSecondary }}>
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter
              </kbd> to save
            </div>
          </div>
        ) : (
          <div className="flex justify-center p-3">
            <MathRenderer latex={latex} display={true} />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default MathNodeView;