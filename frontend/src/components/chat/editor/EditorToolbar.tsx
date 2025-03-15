import React from 'react';
import { Editor } from '@tiptap/react';
import { useTheme } from '../../../context/ThemeContext';

interface EditorToolbarProps {
  editor: Editor | null;
  previewMode: boolean;
  onTogglePreview: () => void;
  onMathClick?: () => void;
  onCodeClick?: () => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  previewMode,
  onTogglePreview,
  onMathClick,
  onCodeClick
}) => {
  const { currentTheme } = useTheme();
  
  if (!editor) return null;
  
  const buttonStyles = {
    backgroundColor: `${currentTheme.colors.bgTertiary}50`,
    color: currentTheme.colors.textSecondary,
    border: `1px solid ${currentTheme.colors.borderColor}20`,
  };
  
  const activeButtonStyles = {
    backgroundColor: `${currentTheme.colors.accentPrimary}20`,
    color: currentTheme.colors.accentPrimary,
    border: `1px solid ${currentTheme.colors.accentPrimary}30`,
  };
  
  return (
    <div className="flex flex-wrap gap-1.5">
      {/* Editing toolbar shown only when not in preview mode */}
      {!previewMode && (
        <>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded text-xs ${editor.isActive('bold') ? 'is-active' : ''}`}
            style={editor.isActive('bold') ? activeButtonStyles : buttonStyles}
            title="Bold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8.21 13c2.106 0 3.412-1.087 3.412-2.823 0-1.306-.984-2.283-2.324-2.386v-.055a2.176 2.176 0 0 0 1.852-2.14c0-1.51-1.162-2.46-3.014-2.46H3.843V13H8.21zM5.908 4.674h1.696c.963 0 1.517.451 1.517 1.244 0 .834-.629 1.32-1.73 1.32H5.908V4.673zm0 6.788V8.598h1.73c1.217 0 1.88.492 1.88 1.415 0 .943-.643 1.449-1.832 1.449H5.907z"/>
            </svg>
          </button>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded text-xs ${editor.isActive('italic') ? 'is-active' : ''}`}
            style={editor.isActive('italic') ? activeButtonStyles : buttonStyles}
            title="Italic"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
              <path d="M7.991 11.674 9.53 4.455c.123-.595.246-.71 1.347-.807l.11-.52H7.211l-.11.52c1.06.096 1.128.212 1.005.807L6.57 11.674c-.123.595-.246.71-1.346.806l-.11.52h3.774l.11-.52c-1.06-.095-1.129-.211-1.006-.806z"/>
            </svg>
          </button>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded text-xs ${editor.isActive('code') ? 'is-active' : ''}`}
            style={editor.isActive('code') ? activeButtonStyles : buttonStyles}
            title="Inline Code"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
              <path d="M10.478 1.647a.5.5 0 1 0-.956-.294l-4 13a.5.5 0 0 0 .956.294l4-13zM4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0zm6.292 0a.5.5 0 0 0 0 .708L14.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0z"/>
            </svg>
          </button>
          
          <div className="h-5 w-px mx-1" style={{ backgroundColor: `${currentTheme.colors.borderColor}40` }}></div>
          
          <button
            type="button"
            onClick={() => {
              // If a handler is provided, use that first
              if (onCodeClick) {
                onCodeClick();
                return;
              }
              
              // Convert selected text to a code block
              const { state, dispatch } = editor.view;
              const { from, to } = state.selection;
              
              // Check if text is selected
              if (from !== to) {
                const selectedText = state.doc.textBetween(from, to);
                
                // Delete the selected text
                const tr = state.tr.delete(from, to);
                
                // Insert code block with the selected text
                editor.chain()
                  .focus()
                  .deleteSelection()
                  .insertContent({
                    type: 'customCodeBlock',
                    attrs: { language: 'javascript' },
                    content: [{ type: 'text', text: selectedText }]
                  })
                  .run();
              } else {
                // If no text is selected, insert empty code block
                editor.chain()
                  .focus()
                  .insertContent({
                    type: 'customCodeBlock',
                    attrs: { language: 'javascript' },
                    content: [{ type: 'text', text: '' }]
                  })
                  .run();
              }
            }}
            className="p-1.5 rounded text-xs"
            style={buttonStyles}
            title="Insert Code Block"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146z"/>
            </svg>
          </button>
          
          <button
            type="button"
            onClick={() => {
              // If a handler is provided, use that first
              if (onMathClick) {
                onMathClick();
                return;
              }
              
              // Otherwise, inline conversion
              const { state } = editor.view;
              const { from, to } = state.selection;
              
              // Check if text is selected
              if (from !== to) {
                const selectedText = state.doc.textBetween(from, to);
                
                // Insert math inline with the selected text
                editor.chain()
                  .focus()
                  .deleteSelection()
                  .insertContent({
                    type: 'mathInline',
                    attrs: { value: selectedText }
                  })
                  .run();
              } else {
                // If no text is selected, use block math
                editor.chain()
                  .focus()
                  .insertContent({
                    type: 'mathBlock',
                    content: [{ type: 'text', text: '' }]
                  })
                  .run();
              }
            }}
            className="p-1.5 rounded text-xs"
            style={buttonStyles}
            title="Insert Math Expression"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8.41 7.56C7.55 7.81 6.68 7.94 5.8 7.94c-1.25 0-2.45-.2-3.57-.57-.35-.12-.75-.03-1.02.24-.27.27-.36.68-.24 1.04.37.98.92 1.88 1.62 2.67.35.4.98.52 1.48.28.67-.32 1.39-.5 2.13-.5.64 0 1.27.13 1.86.38.93.4 2 .4 2.93 0 .6-.25 1.22-.38 1.87-.38.71 0 1.4.17 2.04.46.44.21.98.09 1.3-.26.72-.78 1.3-1.67 1.68-2.65.13-.34.04-.73-.22-1-.26-.26-.65-.37-1-.27-1.13.37-2.34.57-3.6.57-.87 0-1.73-.13-2.54-.37.29-.12.56-.27.8-.44.34-.24.89-.24 1.23 0 .81.57 1.92.87 3.05.87.95 0 1.89-.21 2.82-.62.35-.15.57-.48.57-.85a.96.96 0 0 0-.4-.76c-.67-.46-1.36-.84-2.07-1.13-.71-.29-1.48-.45-2.25-.45-.97 0-1.9.27-2.71.76-.34.22-.88.22-1.22 0A4.64 4.64 0 0 0 5.8 4.4c-.77 0-1.54.15-2.23.44-.66.28-1.29.63-1.88 1.05-.29.2-.46.54-.46.88 0 .37.22.7.57.85.92.4 1.84.6 2.79.6 1.13 0 2.25-.3 3.06-.87.33-.24.88-.24 1.22 0 .25.18.53.33.83.46l-.29-.25Z"/>
            </svg>
          </button>
        </>
      )}
      
      {/* Preview toggle button - always visible */}
      <div className="h-5 w-px mx-1" style={{ backgroundColor: `${currentTheme.colors.borderColor}40` }}></div>
      
      <button
        type="button"
        onClick={onTogglePreview}
        className="p-1.5 rounded text-xs"
        style={previewMode ? activeButtonStyles : buttonStyles}
        title={previewMode ? "Edit Mode" : "Preview Mode"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
          <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
          <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
        </svg>
      </button>
    </div>
  );
};

export default EditorToolbar;