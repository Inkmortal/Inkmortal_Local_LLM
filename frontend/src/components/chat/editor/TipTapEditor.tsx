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
  onSend: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isGenerating?: boolean;
  onInsertCode?: (codeSnippet: string) => void;
  onInsertMath?: (mathSnippet: string) => void;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  isGenerating = false,
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
    onSend(content);
    editor.commands.clearContent();
  }, [editor, onSend, disabled]);
  
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
  const handleInsertMath = useCallback(() => {
    setMathEditorOpen(true);
  }, []);

  // Handler to open the code editor modal
  const handleInsertCode = useCallback(() => {
    setCodeEditorOpen(true);
  }, []);

  // Register handlers for external components to open these modals with proper cleanup
  useEffect(() => {
    // Skip this effect if editor isn't ready
    if (!editor) return;
    
    // Create persistent handlers that don't change on each render
    if (onInsertMath && !mathHandlerRef.current) {
      mathHandlerRef.current = (input: string) => {
        if (input === "OPEN_MODAL") {
          setMathEditorOpen(true);
          return;
        }
        
        // Only try to insert if editor exists and is mounted
        if (editor && editor.isEditable) {
          try {
            // Extract latex from $$ delimiters if present
            const latex = input.replace(/\$\$/g, '').trim();
            
            editor
              .chain()
              .focus()
              .insertContent({
                type: 'mathBlock',
                content: [{ type: 'text', text: latex }]
              })
              // Add a newline after the block
              .insertContent({ type: 'paragraph' })
              .run();
          } catch (error) {
            console.error("Failed to insert math block:", error);
          }
        }
      };
      
      // Register the persistent handler
      onInsertMath(mathHandlerRef.current);
    }
    
    if (onInsertCode && !codeHandlerRef.current) {
      codeHandlerRef.current = (input: string) => {
        if (input === "OPEN_MODAL") {
          setCodeEditorOpen(true);
          return;
        }
        
        // Only try to insert if editor exists and is mounted
        if (editor && editor.isEditable) {
          try {
            // Extract language and code from markdown code block syntax if present
            let language = 'javascript';
            let code = input;
            
            const codeBlockMatch = input.match(/```([a-zA-Z0-9_]+)?\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
              if (codeBlockMatch[1]) language = codeBlockMatch[1];
              code = codeBlockMatch[2].trim();
            }
            
            editor
              .chain()
              .focus()
              .insertContent({
                type: 'customCodeBlock',
                attrs: { language },
                content: [{ type: 'text', text: code }]
              })
              // Add a newline after the block
              .insertContent({ type: 'paragraph' })
              .run();
          } catch (error) {
            console.error("Failed to insert code block:", error);
          }
        }
      };
      
      // Register the persistent handler
      onInsertCode(codeHandlerRef.current);
    }
    
    // Cleanup function to prevent memory leaks
    return () => {
      mathHandlerRef.current = null;
      codeHandlerRef.current = null;
    };
  }, [editor, onInsertMath, onInsertCode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  const handleMathSubmit = (latex: string) => {
    if (!latex.trim() || !editor) return;

    try {
      // Safe approach with manual content insertion
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'mathBlock',
          content: [{ type: 'text', text: latex.trim() }]
        })
        // Add a newline after the block
        .insertContent({ type: 'paragraph' })
        .run();
      
      setMathEditorOpen(false);
    } catch (error) {
      console.error("Error inserting math block:", error);
      setMathEditorOpen(false);
    }
  };

  const handleCodeSubmit = (code: string, language: string) => {
    if (!code.trim() || !editor) return;
    
    try {
      // Safe approach with manual content insertion
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'customCodeBlock',
          attrs: { language },
          content: [{ type: 'text', text: code.trim() }]
        })
        // Add a newline after the block
        .insertContent({ type: 'paragraph' })
        .run();
      
      setCodeEditorOpen(false);
    } catch (error) {
      console.error("Error inserting code block:", error);
      setCodeEditorOpen(false);
    }
  };
  
  // Toggle preview mode
  const togglePreviewMode = useCallback(() => {
    setPreviewMode(!previewMode);
  }, [previewMode]);

  return (
    <div className="relative">
      <div
        className="relative rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          backgroundColor: currentTheme.colors.bgSecondary,
          boxShadow: `0 0 0 1px ${currentTheme.colors.borderColor}40, 0 4px 16px rgba(0,0,0,0.08)`,
        }}
      >
        {/* Ambient gradient effects */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, ${currentTheme.colors.accentPrimary}30 0%, transparent 70%),
              radial-gradient(circle at 80% 80%, ${currentTheme.colors.accentSecondary}30 0%, transparent 70%)
            `,
          }}
        />
        
        {/* Top highlight bar */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{
            background: `linear-gradient(to right, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary}, ${currentTheme.colors.accentPrimary})`,
            backgroundSize: '200% 100%',
            animation: 'gradientAnimation 6s ease infinite'
          }}
        />
        
        {/* Editor content or Preview depending on mode */}
        <div className="relative z-10" ref={editorContentRef}>
          {previewMode ? (
            <div
              className="p-3 min-h-[80px] max-h-[300px] overflow-auto scrollbar-thin whitespace-pre-wrap break-words"
              style={{ color: currentTheme.colors.textPrimary }}
            >
              {editor && !editor.isEmpty ? (
                <MessageParser content={editor.getHTML()} />
              ) : (
                <div className="text-gray-400 italic">Nothing to preview</div>
              )}
            </div>
          ) : (
            <EditorContent
              editor={editor}
              onKeyDown={handleKeyDown}
            />
          )}
        </div>
        
        {/* Bottom toolbar */}
        <div className="px-3 pb-2.5 pt-1 flex justify-between items-center border-t"
          style={{ borderColor: `${currentTheme.colors.borderColor}30` }}
        >
          <EditorToolbar
            editor={editor}
            previewMode={previewMode}
            onTogglePreview={togglePreviewMode}
            onInsertMath={handleInsertMath}
            onInsertCode={handleInsertCode}
          />
          
          <button
            disabled={disabled || editor?.isEmpty}
            className={`rounded-full py-2 px-4 transition-all ${
              editor?.isEmpty || disabled ? 'opacity-50' : 'opacity-100 hover:scale-[1.03] hover:shadow-lg active:scale-[0.97]'
            }`}
            style={{ 
              background: !editor?.isEmpty && !disabled
                ? `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})` 
                : `${currentTheme.colors.bgTertiary}`,
              color: !editor?.isEmpty && !disabled ? '#fff' : currentTheme.colors.textMuted,
              boxShadow: !editor?.isEmpty && !disabled ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
            }}
            onClick={handleSendClick}
          >
            <div className="flex items-center text-sm font-medium">
              {isGenerating ? (
                <>
                  <span className="mr-1.5">Generating</span>
                  <div className="flex space-x-1 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'currentColor', animationDuration: '1s' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'currentColor', animationDuration: '1s', animationDelay: '0.15s' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'currentColor', animationDuration: '1s', animationDelay: '0.3s' }}></div>
                  </div>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <svg className="ml-1.5 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </div>
          </button>
        </div>
      </div>
      
      {/* Math expression editor modal */}
      {mathEditorOpen && (
        <MathExpressionEditor
          onSubmit={handleMathSubmit}
          onClose={() => setMathEditorOpen(false)}
        />
      )}
      
      {/* Code editor modal */}
      {codeEditorOpen && (
        <CodeEditor
          onSubmit={handleCodeSubmit}
          onClose={() => setCodeEditorOpen(false)}
        />
      )}
    </div>
  );
};

export default React.memo(TipTapEditor);