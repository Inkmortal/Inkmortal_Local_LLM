# WYSIWYG Chat Interface Implementation Plan

## Overview

This implementation plan replaces the current custom rich text input solution with a more robust approach using TipTap, ensuring an elegant, beautiful, and functional user experience.

## Current Issues

- Custom cursor position tracking is complex and error-prone
- Disconnect between input (plain text) and output (rendered content)
- Basic rendering for math expressions and code blocks
- Multiple focus management techniques causing unpredictable behavior

## Implementation Goals

1. True WYSIWYG experience (what you see is what you get)
2. Seamless integration with existing theme system
3. Proper support for educational features (math, code blocks)
4. Maintainable code structure with clear separation of concerns
5. Improved accessibility and user experience

## Dependencies to Add

```json
{
  "dependencies": {
    "crypto-js": "^4.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.2",
    "uuid": "^11.1.0",
    
    // New dependencies
    "@tiptap/react": "^2.2.4",
    "@tiptap/pm": "^2.2.4",
    "@tiptap/starter-kit": "^2.2.4",
    "@tiptap/extension-placeholder": "^2.2.4",
    "@tiptap/extension-image": "^2.2.4",
    "katex": "^0.16.9",
    "prismjs": "^1.29.0",
    "react-katex": "^3.0.1",
    "html-react-parser": "^5.1.8"
  },
  "devDependencies": {
    // Existing devDependencies
    // Add these new ones
    "@types/katex": "^0.16.7",
    "@types/prismjs": "^1.26.3"
  }
}
```

## Component Structure

```
src/
├── components/
│   ├── chat/
│   │   ├── ChatInput.tsx               (Replaced with TipTap)
│   │   ├── ChatMessage.tsx             (Updated to use unified rendering)
│   │   ├── MessageParser.tsx           (Enhanced with HTML parser)
│   │   ├── editor/                     (New folder)
│   │   │   ├── TipTapEditor.tsx        (Main editor component)
│   │   │   ├── EditorToolbar.tsx       (Formatting controls)
│   │   │   ├── extensions/             (Custom extensions)
│   │   │   │   ├── MathExtension.ts    (KaTeX integration)
│   │   │   │   ├── CodeBlockExtension.ts (Prism integration)
│   │   │   │   └── ImageExtension.ts   (Image upload support)
│   ├── education/
│   │   ├── MathRenderer.tsx            (Upgraded with KaTeX)
│   │   └── CodeBlock.tsx               (Upgraded with Prism.js)
```

## Implementation Steps

### 1. Set Up TipTap Editor Base

Create the base TipTap editor component that will replace the current ChatInput:

```tsx
// src/components/chat/editor/TipTapEditor.tsx
import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useTheme } from '../../../context/ThemeContext';

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
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'focus:outline-none p-3 min-h-[80px] max-h-[200px] overflow-auto',
      },
    },
    content: '',
    editable: !disabled,
  });

  // Handle submit with Shift+Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault();
      
      if (editor?.isEmpty) return;
      
      const html = editor?.getHTML() || '';
      onSend(html);
      editor?.commands.clearContent();
    }
  };

  return (
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
        <div className="flex space-x-2">
          {/* We'll add toolbar buttons here in the next step */}
        </div>
        
        <button
          disabled={disabled || editor?.isEmpty}
          className={`rounded-full py-2 px-4 transition-all ${
            editor?.isEmpty ? 'opacity-50' : 'opacity-100 hover:scale-[1.03] hover:shadow-lg active:scale-[0.97]'
          }`}
          style={{ 
            background: !editor?.isEmpty
              ? `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})` 
              : `${currentTheme.colors.bgTertiary}`,
            color: !editor?.isEmpty ? '#fff' : currentTheme.colors.textMuted,
            boxShadow: !editor?.isEmpty ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
          }}
          onClick={() => {
            if (editor?.isEmpty) return;
            const html = editor?.getHTML() || '';
            onSend(html);
            editor?.commands.clearContent();
          }}
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
  );
};

export default TipTapEditor;
```

### 2. Add EditorToolbar Component

```tsx
// src/components/chat/editor/EditorToolbar.tsx
import React from 'react';
import { Editor } from '@tiptap/react';
import { useTheme } from '../../../context/ThemeContext';

interface EditorToolbarProps {
  editor: Editor | null;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
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
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`p-1.5 rounded text-xs ${editor.isActive('codeBlock') ? 'is-active' : ''}`}
        style={editor.isActive('codeBlock') ? activeButtonStyles : buttonStyles}
        title="Code Block"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
          <path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146z"/>
        </svg>
      </button>
      
      <div className="h-5 w-px mx-1" style={{ backgroundColor: `${currentTheme.colors.borderColor}40` }}></div>
      
      {/* We'll add math and image buttons in the next steps */}
    </div>
  );
};

export default EditorToolbar;
```

### 3. Create Math Extension

```typescript
// src/components/chat/editor/extensions/MathExtension.ts
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import MathRenderer from '../../../education/MathRenderer';

export const MathExtension = Node.create({
  name: 'mathBlock',
  
  group: 'block',
  
  content: 'text*',
  
  marks: '',
  
  defining: true,
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="math-block"]',
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'math-block' }), 0]
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(MathRenderer)
  },
})
```

### 4. Create Code Block Extension

```typescript
// src/components/chat/editor/extensions/CodeBlockExtension.ts
import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CodeBlock from '../../../education/CodeBlock';

export const CodeBlockExtension = Node.create({
  name: 'customCodeBlock',
  
  group: 'block',
  
  content: 'text*',
  
  marks: '',
  
  defining: true,
  
  addAttributes() {
    return {
      language: {
        default: 'javascript',
      },
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'pre[data-language]',
        getAttrs: (element) => {
          if (typeof element === 'string') return {}
          const dom = element as HTMLElement
          return {
            language: dom.getAttribute('data-language'),
          }
        },
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['pre', { 'data-language': HTMLAttributes.language }, ['code', {}, 0]]
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlock)
  },
})
```

### 5. Enhance MathRenderer with KaTeX

```tsx
// src/components/education/MathRenderer.tsx (Updated)
import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface MathRendererProps {
  latex: string;
  display?: boolean;
  className?: string;
}

const MathRenderer: React.FC<MathRendererProps> = ({ 
  latex, 
  display = false,
  className = ''
}) => {
  const { currentTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`math-renderer ${className}`}>
      <div 
        className={`${display ? 'block py-4 px-4' : 'inline-block py-1 px-2'} relative group`}
        style={{ 
          backgroundColor: display ? `${currentTheme.colors.bgTertiary}40` : 'transparent',
          borderRadius: '0.375rem',
          border: display ? `1px solid ${currentTheme.colors.borderColor}40` : 'none'
        }}
      >
        {display && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              className="text-xs px-2 py-0.5 rounded"
              style={{ 
                backgroundColor: copied 
                  ? `${currentTheme.colors.accentSecondary}20` 
                  : `${currentTheme.colors.accentPrimary}20`,
                color: copied 
                  ? currentTheme.colors.accentSecondary 
                  : currentTheme.colors.accentPrimary
              }}
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
        
        <div className={`${display ? 'text-center' : ''} math-content`}>
          {display ? (
            <BlockMath math={latex} errorColor={currentTheme.colors.error} />
          ) : (
            <InlineMath math={latex} errorColor={currentTheme.colors.error} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MathRenderer;
```

### 6. Enhance CodeBlock with Prism.js

```tsx
// src/components/education/CodeBlock.tsx (Updated)
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ 
  code, 
  language = 'javascript',
  className = '' 
}) => {
  const { currentTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    Prism.highlightAll();
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className={`rounded-md overflow-hidden ${className}`}
      style={{ 
        backgroundColor: '#282c34',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
      }}
    >
      <div className="flex justify-between items-center px-4 py-2 text-xs" style={{ backgroundColor: '#21252b' }}>
        <div className="flex items-center">
          <div className="flex space-x-1.5 mr-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
          </div>
          <span style={{ color: '#aab1c0' }}>{language}</span>
        </div>
        <button
          className="text-xs px-2 py-1 rounded transition-colors"
          style={{ 
            backgroundColor: copied ? `${currentTheme.colors.accentSecondary}20` : `${currentTheme.colors.accentPrimary}20`,
            color: copied ? currentTheme.colors.accentSecondary : currentTheme.colors.accentPrimary 
          }}
          onClick={handleCopy}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre 
        className="p-4 overflow-x-auto text-sm font-mono leading-relaxed" 
        style={{ 
          margin: 0, 
          backgroundColor: '#282c34',
          maxHeight: '400px'
        }}
      >
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;
```

### 7. Update ChatInput Component

```tsx
// src/components/chat/ChatInput.tsx (Complete Replacement)
import React from 'react';
import TipTapEditor from './editor/TipTapEditor';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isGenerating?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  disabled = false, 
  placeholder = "Type a message...",
  isGenerating = false,
}) => {
  const handleSend = (html: string) => {
    // Convert HTML to the format expected by the backend
    // For now, just send the raw HTML
    onSend(html);
  };

  return (
    <div className="w-full relative z-50">
      <TipTapEditor
        onSend={handleSend}
        disabled={disabled}
        placeholder={placeholder}
        isGenerating={isGenerating}
      />
      
      <div className="text-xs text-center mt-2 opacity-70">
        <div className="text-xs flex items-center justify-center">
          <span>Use</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-medium mx-1">Shift</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-medium mx-1">↵</kbd>
          <span>for line break</span>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
```

### 8. Update ChatMessage Component

```tsx
// src/components/chat/ChatMessage.tsx (Updated rendering part)
// ...existing code...

// Inside the ChatMessage component, update the message content rendering:
{/* Message content */}
<div className="whitespace-pre-wrap break-words relative z-10">
  {typeof message.content === 'string' ? (
    // For backward compatibility with plain text messages
    <MessageParser content={message.content} />
  ) : (
    // For new HTML content format
    <div dangerouslySetInnerHTML={{ __html: message.content }} />
  )}
</div>

// ...rest of existing code...
```

### 9. Update MessageParser Component

```tsx
// src/components/chat/MessageParser.tsx (Updated)
import React, { ReactNode } from 'react';
import parse from 'html-react-parser';
import MathRenderer from '../education/MathRenderer';
import CodeBlock from '../education/CodeBlock';

interface MessageParserProps {
  content: string;
}

const MessageParser: React.FC<MessageParserProps> = ({ content }) => {
  // Parse the legacy message content format with markdown-like syntax
  const parseContent = (text: string): ReactNode[] => {
    // Original parsing logic remains for backward compatibility
    // ... (keep existing code)
    
    return elements;
  };
  
  // Check if content is HTML or plain text
  const isHTML = content.startsWith('<') && content.endsWith('>');
  
  if (isHTML) {
    // If HTML, use html-react-parser
    return (
      <div className="message-content">
        {parse(content, {
          replace: (domNode) => {
            // Custom replacements for special components
            if (domNode.type === 'tag') {
              // Handle math blocks
              if (domNode.name === 'div' && domNode.attribs && domNode.attribs['data-type'] === 'math-block') {
                // Extract latex content
                if (domNode.children && domNode.children[0]?.type === 'text') {
                  return <MathRenderer latex={domNode.children[0].data || ''} display={true} />;
                }
              }
              
              // Handle code blocks
              if (domNode.name === 'pre' && domNode.attribs && domNode.attribs['data-language']) {
                const language = domNode.attribs['data-language'];
                const codeNode = domNode.children?.find(child => child.name === 'code');
                const code = codeNode?.children?.[0]?.data || '';
                return <CodeBlock code={code} language={language} />;
              }
            }
            return undefined;
          }
        })}
      </div>
    );
  }
  
  // Else, use the original parser for backward compatibility
  return (
    <div className="message-content">
      {parseContent(content)}
    </div>
  );
};

export default MessageParser;
```

## CSS Requirements

Add these to your global CSS or in a specific file:

```css
/* Add to src/styles/editor.css */

/* TipTap base styles */
.ProseMirror {
  outline: none;
}

.ProseMirror p {
  margin: 0.5em 0;
}

.ProseMirror > *:first-child {
  margin-top: 0;
}

.ProseMirror > *:last-child {
  margin-bottom: 0;
}

/* Code block styles */
.ProseMirror pre {
  background-color: #282c34;
  border-radius: 0.375rem;
  color: #abb2bf;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  padding: 0.75em 1em;
  margin: 0.5em 0;
}

/* Math block styles */
.ProseMirror [data-type="math-block"] {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 0.375rem;
  padding: 0.5em;
  margin: 0.5em 0;
  text-align: center;
}

/* Placeholder */
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--text-muted, #9ca3af);
  pointer-events: none;
  height: 0;
}

/* Animation for editor toolbar */
@keyframes gradientAnimation {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Animation for cursor blink */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

## Migration Strategy

1. Install all dependencies
2. Create the new components one by one
3. Test each component in isolation
4. Replace the existing ChatInput with the new TipTapEditor
5. Update the ChatMessage component to handle both formats
6. Add CSS styles
7. Test the entire flow

## Future Enhancements

1. Add image upload functionality
2. Support for collaborative editing
3. Improved editor extensions for educational features
4. Saving drafts of messages
5. Message edit functionality

## Final Notes

- The implementation keeps files under 300 lines as requested
- There's a clear separation of concerns between different components
- The UI preserves the elegant and beautiful design while improving functionality
- Theme integration is preserved throughout all components
- Both modern and legacy message formats are supported for backward compatibility