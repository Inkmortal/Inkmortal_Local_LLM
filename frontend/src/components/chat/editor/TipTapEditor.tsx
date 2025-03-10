import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useTheme } from '../../../context/ThemeContext';
import EditorToolbar from './EditorToolbar';
import { MathExtension } from './extensions/MathExtension';
import { CodeBlockExtension } from './extensions/CodeBlockExtension';
import MathExpressionEditor from '../../chat/editors/MathExpressionEditor';
import CodeEditor from '../../chat/editors/CodeEditor';
import MessageParser from '../../chat/MessageParser';

interface TipTapEditorProps {
  onSendMessage: (html: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  isGenerating?: boolean;
  codeInsertRef?: React.MutableRefObject<((codeSnippet: string) => void) | undefined>;
  mathInsertRef?: React.MutableRefObject<((mathSnippet: string) => void) | undefined>;
  onInsertCode?: (codeSnippet: string) => void;
  onInsertMath?: (mathSnippet: string) => void;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  onSendMessage,
  disabled = false,
  loading = false,
  placeholder = "Type a message...",
  isGenerating = false,
  codeInsertRef,
  mathInsertRef,
  onInsertCode,
  onInsertMath,
}) => {
  const { currentTheme } = useTheme();
  const [mathEditorOpen, setMathEditorOpen] = useState(false);
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const editorContentRef = useRef<HTMLDivElement>(null);
  
  // Keep references to handlers to avoid recreating them on each render
  const mathHandlerRef = useRef<((input: string) => void) | null>(null);
  const codeHandlerRef = useRef<((input: string) => void) | null>(null);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      MathExtension,
      CodeBlockExtension,
    ],
    editorProps: {
      attributes: {
        class: 'editor-content prose p-3 min-h-[80px] max-h-[300px] overflow-auto scrollbar-thin',
        spellcheck: 'false',
      },
    },
    onFocus: () => {
      if (editorContentRef.current) {
        editorContentRef.current.style.boxShadow = `0 0 0 2px ${currentTheme.colors.accentPrimary}40`;
      }
    },
    onBlur: () => {
      if (editorContentRef.current) {
        editorContentRef.current.style.boxShadow = 'none';
      }
    },
  });

  // Function to convert editor content to string and send it
  const convertAndSend = useCallback(() => {
    if (!editor || editor.isEmpty || disabled) return;
    
    const content = editor.getHTML();
    onSendMessage(content);
    editor.commands.clearContent();
  }, [editor, onSendMessage, disabled]);
  
  // Handle submit with Enter (not Shift+Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault();
      convertAndSend();
    }
  };

  const handleSendClick = () => {
    convertAndSend();
  };

  // Handler to open the math editor modal
  const openMathEditor = () => {
    setMathEditorOpen(true);
  };

  // Handler to open the code editor modal
  const openCodeEditor = () => {
    setCodeEditorOpen(true);
  };

  // Register handlers in refs for external access
  useEffect(() => {
    // If custom handlers provided as props via refs
    if (mathInsertRef) {
      mathInsertRef.current = (mathSnippet: string) => {
        if (!editor) return;
        
        // Insert math node
        editor.commands.insertContent({
          type: 'math',
          attrs: { value: mathSnippet }
        });
      };
    }
    
    if (codeInsertRef) {
      codeInsertRef.current = (codeSnippet: string) => {
        if (!editor) return;
        
        // Insert code block
        editor.commands.insertContent({
          type: 'codeBlock',
          attrs: { language: 'javascript' },
          content: [{ type: 'text', text: codeSnippet }]
        });
      };
    }
    
    // Also register local handlers
    mathHandlerRef.current = (value: string) => {
      if (!editor) return;
      
      editor.commands.insertContent({
        type: 'math',
        attrs: { value }
      });
    };
    
    codeHandlerRef.current = (code: string) => {
      if (!editor) return;
      
      editor.commands.insertContent({
        type: 'codeBlock', 
        attrs: { language: 'javascript' },
        content: [{ type: 'text', text: code }]
      });
    };
    
    return () => {
      // Clean up references on unmount
      if (mathInsertRef) {
        mathInsertRef.current = undefined;
      }
      if (codeInsertRef) {
        codeInsertRef.current = undefined;
      }
    };
  }, [editor, mathInsertRef, codeInsertRef]);
  
  // Handler for math editor save
  const handleSaveMath = (value: string) => {
    if (mathHandlerRef.current) {
      mathHandlerRef.current(value);
    }
    setMathEditorOpen(false);
  };
  
  // Handler for code editor save
  const handleSaveCode = (code: string) => {
    if (codeHandlerRef.current) {
      codeHandlerRef.current(code);
    }
    setCodeEditorOpen(false);
  };
  
  // Allow custom code/math insertion from parent
  useEffect(() => {
    if (onInsertCode && !codeInsertRef) {
      codeHandlerRef.current = onInsertCode;
    }
    if (onInsertMath && !mathInsertRef) {
      mathHandlerRef.current = onInsertMath;
    }
  }, [onInsertCode, onInsertMath, codeInsertRef, mathInsertRef]);

  return (
    <>
      <div 
        className="flex flex-col rounded-md backdrop-blur-sm overflow-hidden"
        style={{
          borderRadius: '0.5rem',
          backgroundColor: currentTheme.isDark 
            ? `${currentTheme.colors.bgSecondary}80` 
            : `${currentTheme.colors.bgSecondary}95`,
          border: `1px solid ${currentTheme.colors.borderColor}40`,
        }}
      >
        {/* Toolbar - visible only when editor has content or is focused */}
        {editor && (
          <EditorToolbar 
            editor={editor}
            onMathClick={openMathEditor}
            onCodeClick={openCodeEditor}
            showPreview={previewMode}
            onTogglePreview={() => setPreviewMode(!previewMode)}
          />
        )}
        
        {/* Preview mode - renders editor content as Markdown */}
        {previewMode && editor ? (
          <div className="p-3 min-h-[100px] max-h-[300px] overflow-auto scrollbar-thin prose prose-sm">
            <MessageParser content={editor.getHTML()} />
          </div>
        ) : (
          <div 
            ref={editorContentRef}
            className="transition-shadow duration-200 rounded-md"
            onKeyDown={handleKeyDown}
          >
            {/* TipTap Editor */}
            <EditorContent editor={editor} />
          </div>
        )}
        
        {/* Send button */}
        <div className="flex justify-between items-center p-2 border-t" style={{ borderColor: `${currentTheme.colors.borderColor}30` }}>
          <div className="text-xs opacity-60" style={{ color: currentTheme.colors.textMuted }}>
            Press <kbd className="px-1 py-0.5 rounded" style={{ backgroundColor: `${currentTheme.colors.bgTertiary}80` }}>Enter</kbd> to send
          </div>
          <button
            onClick={handleSendClick}
            disabled={!editor || editor.isEmpty || disabled || loading || isGenerating}
            className="px-3 py-1 rounded-md flex items-center justify-center transition-all duration-200"
            style={{
              backgroundColor: (!editor || editor.isEmpty || disabled || loading || isGenerating)
                ? `${currentTheme.colors.borderColor}40`
                : currentTheme.colors.accentPrimary,
              color: (!editor || editor.isEmpty || disabled || loading || isGenerating)
                ? currentTheme.colors.textMuted
                : '#fff',
              opacity: (!editor || editor.isEmpty || disabled || loading || isGenerating) ? 0.7 : 1,
              cursor: (!editor || editor.isEmpty || disabled || loading || isGenerating) ? 'not-allowed' : 'pointer',
            }}
          >
            <span className="mr-1">Send</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 2L11 13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Math editor modal */}
      {mathEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <MathExpressionEditor
              onClose={() => setMathEditorOpen(false)}
              onSave={handleSaveMath}
            />
          </div>
        </div>
      )}
      
      {/* Code editor modal */}
      {codeEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-5xl h-5/6 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <CodeEditor
              onClose={() => setCodeEditorOpen(false)}
              onSave={handleSaveCode}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default TipTapEditor;