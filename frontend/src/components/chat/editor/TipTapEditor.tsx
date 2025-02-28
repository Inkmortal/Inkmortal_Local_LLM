import React, { useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useTheme } from '../../../context/ThemeContext';
import EditorToolbar from './EditorToolbar';
import { MathExtension } from './extensions/MathExtension';
import { CodeBlockExtension } from './extensions/CodeBlockExtension';

interface TipTapEditorProps {
  onSend: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isGenerating?: boolean;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  isGenerating = false,
}) => {
  const { currentTheme } = useTheme();
  const [mathDialogOpen, setMathDialogOpen] = useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [mathInput, setMathInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  
  const mathInputRef = useRef<HTMLTextAreaElement>(null);
  const codeInputRef = useRef<HTMLTextAreaElement>(null);
  
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
    setMathDialogOpen(true);
    setTimeout(() => {
      if (mathInputRef.current) {
        mathInputRef.current.focus();
      }
    }, 100);
  }, []);

  const handleInsertCode = useCallback(() => {
    setCodeDialogOpen(true);
    setTimeout(() => {
      if (codeInputRef.current) {
        codeInputRef.current.focus();
      }
    }, 100);
  }, []);

  const handleMathSubmit = () => {
    if (mathInput.trim() && editor) {
      editor.commands.setMathBlock(mathInput.trim());
      setMathInput('');
      setMathDialogOpen(false);
    }
  };

  const handleCodeSubmit = () => {
    if (codeInput.trim() && editor) {
      editor.commands.setCodeBlock(codeInput.trim(), codeLanguage);
      setCodeInput('');
      setCodeDialogOpen(false);
    }
  };

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

      {/* Math dialog */}
      {mathDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            className="bg-white rounded-lg p-4 max-w-md w-full"
            style={{ 
              backgroundColor: currentTheme.colors.bgSecondary,
              boxShadow: `0 10px 25px rgba(0,0,0,0.2)`,
              border: `1px solid ${currentTheme.colors.borderColor}40`
            }}
          >
            <h3 className="text-lg font-medium mb-3" style={{ color: currentTheme.colors.textPrimary }}>
              Insert Math Expression
            </h3>
            <textarea
              ref={mathInputRef}
              value={mathInput}
              onChange={(e) => setMathInput(e.target.value)}
              className="w-full p-3 min-h-[120px] rounded-md mb-3"
              style={{ 
                backgroundColor: currentTheme.colors.bgPrimary,
                color: currentTheme.colors.textPrimary,
                border: `1px solid ${currentTheme.colors.borderColor}40`
              }}
              placeholder="Enter LaTeX, e.g.: \sum_{i=1}^{n} i^2 = \frac{n(n+1)(2n+1)}{6}"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setMathDialogOpen(false)}
                className="px-4 py-2 rounded-md"
                style={{ 
                  backgroundColor: `${currentTheme.colors.bgTertiary}40`,
                  color: currentTheme.colors.textSecondary
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleMathSubmit}
                className="px-4 py-2 rounded-md"
                style={{ 
                  backgroundColor: currentTheme.colors.accentPrimary,
                  color: '#fff'
                }}
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code dialog */}
      {codeDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            className="bg-white rounded-lg p-4 max-w-md w-full"
            style={{ 
              backgroundColor: currentTheme.colors.bgSecondary,
              boxShadow: `0 10px 25px rgba(0,0,0,0.2)`,
              border: `1px solid ${currentTheme.colors.borderColor}40`
            }}
          >
            <h3 className="text-lg font-medium mb-3" style={{ color: currentTheme.colors.textPrimary }}>
              Insert Code Block
            </h3>
            <div className="mb-3">
              <label className="block text-sm mb-1" style={{ color: currentTheme.colors.textSecondary }}>
                Language
              </label>
              <select
                value={codeLanguage}
                onChange={(e) => setCodeLanguage(e.target.value)}
                className="w-full p-2 rounded-md"
                style={{ 
                  backgroundColor: currentTheme.colors.bgPrimary,
                  color: currentTheme.colors.textPrimary,
                  border: `1px solid ${currentTheme.colors.borderColor}40`
                }}
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="c">C</option>
                <option value="cpp">C++</option>
                <option value="csharp">C#</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="sql">SQL</option>
                <option value="bash">Bash</option>
                <option value="json">JSON</option>
                <option value="yaml">YAML</option>
                <option value="markdown">Markdown</option>
              </select>
            </div>
            <textarea
              ref={codeInputRef}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              className="w-full p-3 min-h-[150px] rounded-md mb-3 font-mono text-sm"
              style={{ 
                backgroundColor: '#282c34',
                color: '#abb2bf',
                border: `1px solid ${currentTheme.colors.borderColor}40`
              }}
              placeholder="// Enter your code here"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setCodeDialogOpen(false)}
                className="px-4 py-2 rounded-md"
                style={{ 
                  backgroundColor: `${currentTheme.colors.bgTertiary}40`,
                  color: currentTheme.colors.textSecondary
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCodeSubmit}
                className="px-4 py-2 rounded-md"
                style={{ 
                  backgroundColor: currentTheme.colors.accentPrimary,
                  color: '#fff'
                }}
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TipTapEditor;