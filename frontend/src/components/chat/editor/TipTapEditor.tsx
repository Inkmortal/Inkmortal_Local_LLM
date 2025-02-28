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
        class: 'focus:outline-none p-3 min-h-[80px] max-h-[300px] overflow-auto scrollbar-thin',
      },
    },
    content: '',
    editable: !disabled,
  });

  // Convert HTML to markdown and send
  const convertAndSend = async () => {
    if (editor?.isEmpty) return;
    
    const html = editor?.getHTML() || '';
    
    try {
      // Import the converter function (will be bundled at build time)
      const { convertEditorContentToMarkdown } = await import('../../../utils/editorUtils');
      
      // Convert HTML to markdown
      const markdown = convertEditorContentToMarkdown(html);
      console.log('Sending converted markdown to LLM:', markdown);
      
      // Send markdown to the LLM
      onSend(markdown);
      editor?.commands.clearContent();
    } catch (error) {
      console.error('Error converting HTML to markdown:', error);
      // Fallback to plain text if conversion fails
      onSend(editor?.getText() || '');
      editor?.commands.clearContent();
    }
  };
  
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

  // Register handlers for external components to open these modals
  useEffect(() => {
    if (onInsertMath) {
      // Important: Pass a new function that directly opens the modal
      // when the special "OPEN_MODAL" command is received
      onInsertMath((input: string) => {
        console.log("Math handler called with:", input);
        
        if (input === "OPEN_MODAL") {
          console.log("Opening math modal directly!");
          setMathEditorOpen(true);
          return;
        }
        
        // Otherwise handle as regular math content
        if (editor) {
          try {
            // Extract latex from $$ delimiters if present
            const latex = input.replace(/\$\$/g, '').trim();
            console.log("Inserting math content:", latex.substring(0, 30) + "...");
            
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
              
            console.log("Math block inserted successfully!");
          } catch (error) {
            console.error("Failed to insert math block:", error);
          }
        }
      });
    }
    
    if (onInsertCode) {
      // Important: Pass a new function that directly opens the modal
      // when the special "OPEN_MODAL" command is received
      onInsertCode((input: string) => {
        console.log("Code handler called with:", input);
        
        if (input === "OPEN_MODAL") {
          console.log("Opening code modal directly!");
          setCodeEditorOpen(true);
          return;
        }
        
        // Otherwise handle as regular code content
        if (editor) {
          try {
            // Extract language and code from markdown code block syntax if present
            let language = 'javascript';
            let code = input;
            
            const codeBlockMatch = input.match(/```(\w+)?\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
              language = codeBlockMatch[1] || 'javascript';
              code = codeBlockMatch[2].trim();
              console.log(`Extracted code: language=${language}, content=${code.substring(0, 30)}...`);
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
              
            console.log("Code block inserted successfully!");
          } catch (error) {
            console.error("Failed to insert code block:", error);
          }
        }
      });
    }
  }, [onInsertMath, onInsertCode, editor]);

  // Debug logging to see what's happening with the editor
  useEffect(() => {
    console.log("Editor initialized:", !!editor);
    if (editor) {
      console.log("Editor has mathBlock:", !!editor.commands.mathBlock);
      console.log("Editor has customCodeBlock:", !!editor.commands.customCodeBlock);
    }
  }, [editor]);

  const handleMathSubmit = (latex: string) => {
    if (!latex.trim() || !editor) return;

    console.log("Inserting math from editor:", latex.trim());

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

      console.log("Math block inserted successfully");
      
      setMathEditorOpen(false);
    } catch (error) {
      console.error("Error inserting math block:", error);
      setMathEditorOpen(false);
    }
  };

  const handleCodeSubmit = (code: string, language: string) => {
    if (!code.trim() || !editor) return;
    
    console.log("Inserting code from editor:", code.trim(), "language:", language);

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

      console.log("Code block inserted successfully");
      
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
        <div className="relative z-10">
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