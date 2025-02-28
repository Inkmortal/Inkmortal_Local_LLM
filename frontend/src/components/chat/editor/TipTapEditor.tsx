import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useTheme } from '../../../context/ThemeContext';
import EditorToolbar from './EditorToolbar';
import { MathExtension } from './extensions/MathExtension';
import { CodeBlockExtension } from './extensions/CodeBlockExtension';
import MathExpressionEditor from '../../chat/editors/MathExpressionEditor';
import CodeEditor from '../../chat/editors/CodeEditor';

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
        class: 'focus:outline-none p-3 min-h-[80px] max-h-[200px] overflow-auto',
      },
    },
    content: '',
    editable: !disabled,
  });

  // Handle submit with Enter (not Shift+Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault();
      
      if (editor?.isEmpty) return;
      
      const html = editor?.getHTML() || '';
      onSend(html);
      editor?.commands.clearContent();
    }
  };

  const handleSendClick = () => {
    if (editor?.isEmpty) return;
    
    const html = editor?.getHTML() || '';
    onSend(html);
    editor?.commands.clearContent();
  };

  const handleInsertMath = useCallback(() => {
    setMathEditorOpen(true);
  }, []);

  const handleInsertCode = useCallback(() => {
    setCodeEditorOpen(true);
  }, []);

  const handleMathSubmit = (latex: string) => {
    if (latex.trim() && editor) {
      // Command is under mathBlock namespace
      editor.chain().focus().mathBlock.setMathBlock(latex.trim()).run();
      setMathEditorOpen(false);
      
      // Call the external handler if provided
      if (onInsertMath) {
        onInsertMath(`$$${latex.trim()}$$`);
      }
    }
  };

  const handleCodeSubmit = (code: string, language: string) => {
    if (code.trim() && editor) {
      // Command is under customCodeBlock namespace
      editor.chain().focus().customCodeBlock.setCodeBlock(code.trim(), language).run();
      setCodeEditorOpen(false);
      
      // Call the external handler if provided
      if (onInsertCode) {
        onInsertCode(`\`\`\`${language}\n${code.trim()}\n\`\`\``);
      }
    }
  };
  
  // Register with the external system
  useEffect(() => {
    if (onInsertCode && typeof onInsertCode === 'function') {
      onInsertCode(`// Your code will appear in the editor`);
    }
    
    if (onInsertMath && typeof onInsertMath === 'function') {
      onInsertMath(`\\text{Your math expressions will appear in the editor}`);
    }
  }, [onInsertCode, onInsertMath]);
  
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
        
        {/* Editor content */}
        <EditorContent 
          editor={editor} 
          onKeyDown={handleKeyDown}
          className="relative z-10"
        />
        
        {/* Bottom toolbar */}
        <div className="px-3 pb-2.5 pt-1 flex justify-between items-center border-t"
          style={{ borderColor: `${currentTheme.colors.borderColor}30` }}
        >
          <EditorToolbar 
            editor={editor} 
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

      {/* Advanced Math Expression Editor */}
      {mathEditorOpen && (
        <MathExpressionEditor
          onInsert={handleMathSubmit}
          onClose={() => setMathEditorOpen(false)}
        />
      )}

      {/* Advanced Code Editor */}
      {codeEditorOpen && (
        <CodeEditor
          onInsert={handleCodeSubmit}
          onClose={() => setCodeEditorOpen(false)}
        />
      )}
    </div>
  );
};

export default TipTapEditor;