import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';
import CodeBlock from '../education/CodeBlock';
import MathRenderer from '../education/MathRenderer';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onInsertCode?: (codeSnippet: string) => void;
  onInsertMath?: (mathSnippet: string) => void;
  isGenerating?: boolean;
}

// Rich content types for internal rendering
type ContentSegment = 
  | { type: 'text'; content: string; start: number; end: number }
  | { type: 'code'; language: string; content: string; start: number; end: number }
  | { type: 'math'; display: boolean; content: string; start: number; end: number };

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  disabled = false, 
  placeholder = "Type a message...",
  inputRef,
  isGenerating = false,
  onInsertCode,
  onInsertMath
}) => {
  const { currentTheme } = useTheme();
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [segments, setSegments] = useState<ContentSegment[]>([{ type: 'text', content: '', start: 0, end: 0 }]);
  const [cursorPosition, setCursorPosition] = useState<{top: number, left: number} | null>(null);
  const [activeEditor, setActiveEditor] = useState<{type: 'code' | 'math' | null; index: number}>({ type: null, index: -1 });
  const [mathSymbolSearch, setMathSymbolSearch] = useState('');
  const [mathSymbolResults, setMathSymbolResults] = useState<Array<{symbol: string, display: string}>>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Track if user is actively typing for advanced effects
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Common LaTeX symbols
  const mathSymbols = [
    // Greek letters
    { symbol: '\\alpha', display: 'α' },
    { symbol: '\\beta', display: 'β' },
    { symbol: '\\gamma', display: 'γ' },
    { symbol: '\\delta', display: 'δ' },
    { symbol: '\\epsilon', display: 'ε' },
    { symbol: '\\zeta', display: 'ζ' },
    { symbol: '\\eta', display: 'η' },
    { symbol: '\\theta', display: 'θ' },
    { symbol: '\\iota', display: 'ι' },
    { symbol: '\\kappa', display: 'κ' },
    { symbol: '\\lambda', display: 'λ' },
    { symbol: '\\mu', display: 'μ' },
    { symbol: '\\nu', display: 'ν' },
    { symbol: '\\xi', display: 'ξ' },
    { symbol: '\\pi', display: 'π' },
    { symbol: '\\rho', display: 'ρ' },
    { symbol: '\\sigma', display: 'σ' },
    { symbol: '\\tau', display: 'τ' },
    { symbol: '\\upsilon', display: 'υ' },
    { symbol: '\\phi', display: 'φ' },
    { symbol: '\\chi', display: 'χ' },
    { symbol: '\\psi', display: 'ψ' },
    { symbol: '\\omega', display: 'ω' },
    
    // Uppercase Greek letters
    { symbol: '\\Gamma', display: 'Γ' },
    { symbol: '\\Delta', display: 'Δ' },
    { symbol: '\\Theta', display: 'Θ' },
    { symbol: '\\Lambda', display: 'Λ' },
    { symbol: '\\Xi', display: 'Ξ' },
    { symbol: '\\Pi', display: 'Π' },
    { symbol: '\\Sigma', display: 'Σ' },
    { symbol: '\\Phi', display: 'Φ' },
    { symbol: '\\Psi', display: 'Ψ' },
    { symbol: '\\Omega', display: 'Ω' },
    
    // Operators and functions
    { symbol: '\\sum', display: '∑' },
    { symbol: '\\prod', display: '∏' },
    { symbol: '\\int', display: '∫' },
    { symbol: '\\iint', display: '∬' },
    { symbol: '\\iiint', display: '∭' },
    { symbol: '\\oint', display: '∮' },
    { symbol: '\\sqrt{x}', display: '√x' },
    { symbol: '\\frac{x}{y}', display: 'x/y' },
    { symbol: '\\partial', display: '∂' },
    
    // Relations
    { symbol: '\\approx', display: '≈' },
    { symbol: '\\sim', display: '∼' },
    { symbol: '\\neq', display: '≠' },
    { symbol: '\\leq', display: '≤' },
    { symbol: '\\geq', display: '≥' },
    { symbol: '\\ll', display: '≪' },
    { symbol: '\\gg', display: '≫' },
    { symbol: '\\subset', display: '⊂' },
    { symbol: '\\supset', display: '⊃' },
    { symbol: '\\in', display: '∈' },
    { symbol: '\\notin', display: '∉' },
    
    // Arrows
    { symbol: '\\leftarrow', display: '←' },
    { symbol: '\\rightarrow', display: '→' },
    { symbol: '\\leftrightarrow', display: '↔' },
    { symbol: '\\Leftarrow', display: '⇐' },
    { symbol: '\\Rightarrow', display: '⇒' },
    { symbol: '\\Leftrightarrow', display: '⇔' },
    
    // Miscellaneous
    { symbol: '\\infty', display: '∞' },
    { symbol: '\\nabla', display: '∇' },
    { symbol: '\\forall', display: '∀' },
    { symbol: '\\exists', display: '∃' },
    { symbol: '\\nexists', display: '∄' },
    { symbol: '\\therefore', display: '∴' },
    { symbol: '\\because', display: '∵' },
    
    // Templates and structures
    { symbol: '\\begin{matrix} a & b \\\\ c & d \\end{matrix}', display: 'Matrix' },
    { symbol: '\\lim_{x \\to \\infty}', display: 'Limit' },
    { symbol: '\\sum_{i=1}^{n}', display: 'Sum' },
    { symbol: '\\int_{a}^{b}', display: 'Integral' }
  ];
  
  // Parse the message into segments for rendering
  const parseMessage = useCallback(() => {
    if (!message) {
      setSegments([{ type: 'text', content: '', start: 0, end: 0 }]);
      return;
    }

    const newSegments: ContentSegment[] = [];
    let currentIndex = 0;
    
    // Regular expressions for different content types
    const codeBlockRegex = /```([\w-]+)?\n([\s\S]*?)```/g;
    const displayMathRegex = /\$\$([\s\S]*?)\$\$/g;
    const inlineMathRegex = /\$([^$]+)\$/g;
    
    // Store all matches with their positions
    const allMatches: ContentSegment[] = [];
    
    // Find code blocks
    let codeMatch;
    while ((codeMatch = codeBlockRegex.exec(message)) !== null) {
      const language = codeMatch[1] || 'javascript';
      const code = codeMatch[2];
      allMatches.push({
        type: 'code',
        language,
        content: code,
        start: codeMatch.index,
        end: codeMatch.index + codeMatch[0].length
      });
    }
    
    // Find display math
    let displayMathMatch;
    while ((displayMathMatch = displayMathRegex.exec(message)) !== null) {
      // Ignore matches that are inside code blocks
      const insideOtherBlock = allMatches.some(
        match => displayMathMatch!.index >= match.start && displayMathMatch!.index < match.end
      );
      
      if (!insideOtherBlock) {
        allMatches.push({
          type: 'math',
          display: true,
          content: displayMathMatch[1],
          start: displayMathMatch.index,
          end: displayMathMatch.index + displayMathMatch[0].length
        });
      }
    }
    
    // Find inline math
    let inlineMathMatch;
    while ((inlineMathMatch = inlineMathRegex.exec(message)) !== null) {
      // Ignore matches that are inside other blocks
      const insideOtherBlock = allMatches.some(
        match => inlineMathMatch!.index >= match.start && inlineMathMatch!.index < match.end
      );
      
      if (!insideOtherBlock) {
        allMatches.push({
          type: 'math',
          display: false,
          content: inlineMathMatch[1],
          start: inlineMathMatch.index,
          end: inlineMathMatch.index + inlineMathMatch[0].length
        });
      }
    }
    
    // Sort matches by start position
    allMatches.sort((a, b) => a.start - b.start);
    
    // Build the result by combining text and special elements
    for (let i = 0; i < allMatches.length; i++) {
      const match = allMatches[i];
      
      // Add text before the match
      if (match.start > currentIndex) {
        newSegments.push({
          type: 'text',
          content: message.substring(currentIndex, match.start),
          start: currentIndex,
          end: match.start
        });
      }
      
      // Add the special element
      newSegments.push(match);
      
      // Update the current index
      currentIndex = match.end;
    }
    
    // Add any remaining text
    if (currentIndex < message.length) {
      newSegments.push({
        type: 'text',
        content: message.substring(currentIndex),
        start: currentIndex,
        end: message.length
      });
    }
    
    // If no segments were created, add the whole message as text
    if (newSegments.length === 0) {
      newSegments.push({
        type: 'text',
        content: message,
        start: 0,
        end: message.length
      });
    }
    
    setSegments(newSegments);
  }, [message]);

  // Focus techniques to maintain focus during streaming responses
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
      
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      });
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 300);
    }
  }, [disabled, isGenerating]);
  
  // Update segments when message changes
  useEffect(() => {
    parseMessage();
  }, [message, parseMessage]);
  
  // Filter math symbols based on search term
  useEffect(() => {
    if (mathSymbolSearch.trim() === '') {
      setMathSymbolResults(mathSymbols.slice(0, 18)); // Show popular symbols by default
      return;
    }
    
    const searchTerm = mathSymbolSearch.toLowerCase();
    const filtered = mathSymbols.filter(symbol => 
      symbol.symbol.toLowerCase().includes(searchTerm) || 
      symbol.display.toLowerCase().includes(searchTerm)
    );
    
    setMathSymbolResults(filtered.slice(0, 21)); // Limit to 21 results
  }, [mathSymbolSearch]);
  
  // Additional focus interval during streaming
  useEffect(() => {
    let focusInterval: NodeJS.Timeout | null = null;
    
    if (isGenerating) {
      focusInterval = setInterval(() => {
        if (textareaRef.current && document.activeElement !== textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 500);
    }
    
    return () => {
      if (focusInterval) {
        clearInterval(focusInterval);
      }
    };
  }, [isGenerating]);
  
  // Track cursor position for visual effects
  const updateCursorPosition = useCallback(() => {
    if (!textareaRef.current || !containerRef.current) return;
    
    const textarea = textareaRef.current;
    const container = containerRef.current;
    
    // Get cursor position
    const cursorPos = textarea.selectionStart;
    if (cursorPos === textarea.value.length) {
      setCursorPosition(null);
      return;
    }
    
    // Get text until cursor
    const textUntilCursor = textarea.value.substring(0, cursorPos);
    
    // Create a temporary element to measure
    const temp = document.createElement('div');
    temp.style.position = 'absolute';
    temp.style.visibility = 'hidden';
    temp.style.whiteSpace = 'pre-wrap';
    temp.style.width = `${textarea.clientWidth}px`;
    temp.style.fontSize = window.getComputedStyle(textarea).fontSize;
    temp.style.fontFamily = window.getComputedStyle(textarea).fontFamily;
    temp.style.lineHeight = window.getComputedStyle(textarea).lineHeight;
    temp.style.padding = window.getComputedStyle(textarea).padding;
    
    // Calculate position after the last line break
    const lastLineBreak = textUntilCursor.lastIndexOf('\n');
    if (lastLineBreak !== -1) {
      temp.textContent = textUntilCursor.substring(lastLineBreak + 1);
    } else {
      temp.textContent = textUntilCursor;
    }
    
    document.body.appendChild(temp);
    
    // Get the measured position
    const tempRect = temp.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    document.body.removeChild(temp);
    
    // Calculate lines
    const lines = textUntilCursor.split('\n').length - 1;
    const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight);
    
    // Get textarea's scroll position
    const scrollTop = textarea.scrollTop;
    
    // Update cursor position
    setCursorPosition({
      left: tempRect.width,
      top: (lines * lineHeight) - scrollTop + tempRect.height
    });
    
  }, []);
  
  // Function to handle form submission
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (message.trim() && !disabled && !isComposing) {
      onSend(message);
      setMessage('');
      setActiveEditor({ type: null, index: -1 });
      
      if (textareaRef.current) {
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 10);
      }
      
      // Reset typing state
      setIsTyping(false);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    }
  }, [message, disabled, onSend, isComposing]);

  // Handle Shift+Enter for newlines and Enter for submission
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    updateCursorPosition();
    
    // If we're in special editor mode but the editor is not focused, submit on Enter
    // (This allows the textarea to still be the main input element)
    if (e.key === 'Escape' && activeEditor.type !== null) {
      setActiveEditor({ type: null, index: -1 });
      e.preventDefault();
      return;
    }
    
    // Don't submit while IME is composing for international keyboards
    if (e.key === 'Enter' && !e.shiftKey && !isComposing && activeEditor.type === null) {
      e.preventDefault();
      handleSubmit();
    }
    
    // Set typing state
    setIsTyping(true);
    
    // Clear existing timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    
    // Set new timer to detect when typing stops
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
    
  }, [handleSubmit, isComposing, updateCursorPosition, activeEditor]);
  
  // Handle composition events for international keyboards (CJK)
  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => setIsComposing(false);

  // Auto resize textarea as content changes
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  // Update message state and resize textarea
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setTimeout(() => {
      adjustTextareaHeight();
      updateCursorPosition();
    }, 0);
  }, [adjustTextareaHeight, updateCursorPosition]);

  // Focus/blur handlers for styling
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);
  
  // Update cursor position while scrolling or resizing
  const handleScroll = useCallback(() => updateCursorPosition(), [updateCursorPosition]);
  
  // Initialize height
  useEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);
  
  // Set up window resize listener
  useEffect(() => {
    window.addEventListener('resize', updateCursorPosition);
    return () => window.removeEventListener('resize', updateCursorPosition);
  }, [updateCursorPosition]);

  // Function to update a segment's content
  const updateSegmentContent = useCallback((index: number, newContent: string) => {
    setSegments(prev => {
      const newSegments = [...prev];
      if (newSegments[index]) {
        const segment = {...newSegments[index], content: newContent};
        newSegments[index] = segment;
        
        // Rebuild the full message
        const fullMessage = newSegments.map(seg => {
          if (seg.type === 'text') return seg.content;
          if (seg.type === 'code') return '```' + seg.language + '\n' + seg.content + '```';
          if (seg.type === 'math') return seg.display ? '$$' + seg.content + '$$' : '$' + seg.content + '$';
          return '';
        }).join('');
        
        setMessage(fullMessage);
      }
      return newSegments;
    });
  }, []);

  // Function to insert text at cursor position
  const insertTextAtCursor = useCallback((text: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const beforeText = message.substring(0, start);
    const afterText = message.substring(end);
    
    const newValue = beforeText + text + afterText;
    setMessage(newValue);
    
    // Focus and set cursor position after the inserted text
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPosition = start + text.length;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
        adjustTextareaHeight();
      }
    }, 0);
  }, [message, adjustTextareaHeight]);

  // Handle code insertion from parent component
  useEffect(() => {
    if (onInsertCode) {
      onInsertCode((codeSnippet: string) => {
        insertTextAtCursor(codeSnippet);
      });
    }
  }, [onInsertCode, insertTextAtCursor]);

  // Handle math insertion from parent component
  useEffect(() => {
    if (onInsertMath) {
      onInsertMath((mathSnippet: string) => {
        insertTextAtCursor(mathSnippet);
      });
    }
  }, [onInsertMath, insertTextAtCursor]);

  // Function to enter editing mode for a segment
  const enterEditMode = useCallback((type: 'code' | 'math', index: number, e: React.MouseEvent) => {
    // Stop event propagation so we don't lose focus
    e.stopPropagation();
    e.preventDefault();
    
    setActiveEditor({ type, index });
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 10);
  }, []);

  // Function to exit editing mode
  const exitEditMode = useCallback((e: React.MouseEvent) => {
    // Stop event propagation
    e.stopPropagation();
    e.preventDefault();
    
    setActiveEditor({ type: null, index: -1 });
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 10);
  }, []);

  // Function to apply changes from the editor
  const applyEditorChanges = useCallback((e: React.MouseEvent) => {
    // Stop event propagation
    e.stopPropagation();
    e.preventDefault();
    
    const { type, index } = activeEditor;
    if (type === null || index === -1) return;
    
    // Get the current segments
    const segment = segments[index];
    if (!segment) return;
    
    // Update the message with the edited content
    const fullMessage = segments.map((s, i) => {
      if (i === index) {
        if (type === 'code') {
          const codeSegment = s as { type: 'code'; language: string; content: string };
          return '```' + codeSegment.language + '\n' + codeSegment.content + '```';
        } else if (type === 'math') {
          const mathSegment = s as { type: 'math'; display: boolean; content: string };
          return mathSegment.display ? '$$' + mathSegment.content + '$$' : '$' + mathSegment.content + '$';
        }
      }
      
      if (s.type === 'text') return s.content;
      if (s.type === 'code') return '```' + s.language + '\n' + s.content + '```';
      if (s.type === 'math') return s.display ? '$$' + s.content + '$$' : '$' + s.content + '$';
      return '';
    }).join('');
    
    setMessage(fullMessage);
    setActiveEditor({ type: null, index: -1 });
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 10);
  }, [activeEditor, segments]);

  // Insert a math symbol from search results
  const insertMathSymbol = useCallback((symbol: string) => {
    if (activeEditor.type === 'math' && activeEditor.index !== -1) {
      const currentContent = (segments[activeEditor.index] as {content: string}).content;
      updateSegmentContent(activeEditor.index, currentContent + symbol);
      setMathSymbolSearch(''); // Clear the search after inserting
    }
  }, [activeEditor, segments, updateSegmentContent]);

  // Render a preview of the message with formatted segments
  const renderPreview = () => {
    return (
      <div 
        ref={previewRef} 
        className={`px-4 pt-3.5 pb-2 w-full min-h-[40px] ${activeEditor.type !== null ? 'hidden' : 'block'}`}
        style={{ 
          color: currentTheme.colors.textPrimary,
          minHeight: '2.5rem',
          cursor: 'text'
        }}
        onClick={() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }}
      >
        {segments.map((segment, index) => {
          if (segment.type === 'text') {
            // Split text by newlines and handle empty lines
            return segment.content.split('\n').map((line, lineIndex, array) => (
              <React.Fragment key={`text-${index}-${lineIndex}`}>
                {line || (lineIndex < array.length - 1 ? <br /> : null)}
                {lineIndex < array.length - 1 && line && <br />}
              </React.Fragment>
            ));
          }
          
          if (segment.type === 'code') {
            return (
              <div key={`code-${index}`} className="my-2 relative group cursor-pointer" onClick={(e) => enterEditMode('code', index, e)}>
                <CodeBlock 
                  code={segment.content} 
                  language={segment.language} 
                  className="rounded-md overflow-hidden shadow-sm"
                />
                <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  Edit
                </div>
              </div>
            );
          }
          
          if (segment.type === 'math') {
            return (
              <div 
                key={`math-${index}`} 
                className={`${segment.display ? 'my-2 block' : 'inline-block'} cursor-pointer group relative`}
                onClick={(e) => enterEditMode('math', index, e)}
              >
                <MathRenderer 
                  latex={segment.content} 
                  display={segment.display} 
                />
                <div className="absolute top-0 right-0 bg-purple-500 text-white px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  Edit
                </div>
              </div>
            );
          }
          
          return null;
        })}

        {/* Placeholder when empty */}
        {segments.length === 1 && segments[0].content === '' && (
          <div className="opacity-50" style={{ color: currentTheme.colors.textMuted }}>
            {isGenerating ? "AI is generating..." : placeholder}
          </div>
        )}
      </div>
    );
  };

  // Render a special editor for active code/math segment
  const renderActiveEditor = () => {
    if (activeEditor.type === null || activeEditor.index === -1) return null;
    
    const segment = segments[activeEditor.index];
    if (!segment) return null;
    
    if (activeEditor.type === 'code') {
      return (
        <div className="px-4 pt-3.5 pb-2 w-full">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <label className="text-sm mr-2">Language:</label>
              <input 
                type="text" 
                value={(segment as {language: string}).language} 
                onChange={(e) => {
                  const newSegments = [...segments];
                  (newSegments[activeEditor.index] as {language: string}).language = e.target.value;
                  setSegments(newSegments);
                }}
                className="px-2 py-1 text-sm rounded bg-gray-800 text-white"
              />
            </div>
            <div className="flex space-x-2">
              <button 
                className="px-3 py-1 bg-gray-700 text-white text-sm rounded"
                onClick={exitEditMode}
              >
                Cancel
              </button>
              <button 
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded"
                onClick={applyEditorChanges}
              >
                Apply
              </button>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <textarea
              value={(segment as {content: string}).content}
              onChange={(e) => {
                updateSegmentContent(activeEditor.index, e.target.value);
              }}
              className="w-full md:w-1/2 h-32 p-3 bg-gray-900 text-gray-100 font-mono text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your code here..."
              onClick={(e) => e.stopPropagation()}
            />
            <div className="w-full md:w-1/2 h-32 p-0">
              <CodeBlock 
                code={(segment as {content: string}).content} 
                language={(segment as {language: string}).language}
                className="h-full" 
              />
            </div>
          </div>
        </div>
      );
    }
    
    if (activeEditor.type === 'math') {
      return (
        <div className="px-4 pt-3.5 pb-2 w-full">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <label className="text-sm mr-2">Display:</label>
              <input 
                type="checkbox" 
                checked={(segment as {display: boolean}).display} 
                onChange={(e) => {
                  const newSegments = [...segments];
                  (newSegments[activeEditor.index] as {display: boolean}).display = e.target.checked;
                  setSegments(newSegments);
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="ml-1 text-sm">Block equation</span>
            </div>
            <div className="flex space-x-2">
              <button 
                className="px-3 py-1 bg-gray-700 text-white text-sm rounded"
                onClick={exitEditMode}
              >
                Cancel
              </button>
              <button 
                className="px-3 py-1 bg-purple-600 text-white text-sm rounded"
                onClick={applyEditorChanges}
              >
                Apply
              </button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2 flex flex-col">
              <textarea
                value={(segment as {content: string}).content}
                onChange={(e) => {
                  updateSegmentContent(activeEditor.index, e.target.value);
                }}
                className="w-full h-32 p-3 bg-gray-900 text-gray-100 font-mono text-sm rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter LaTeX here..."
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="w-full md:w-1/2 h-32 p-3 bg-gray-800 rounded overflow-auto flex items-center justify-center">
              <MathRenderer 
                latex={(segment as {content: string}).content} 
                display={(segment as {display: boolean}).display} 
              />
            </div>
          </div>
          
          {/* Symbol search */}
          <div className="mt-3">
            <div className="flex mb-2">
              <input
                type="text"
                value={mathSymbolSearch}
                onChange={(e) => setMathSymbolSearch(e.target.value)}
                placeholder="Search for symbols..."
                className="w-full p-2 text-sm rounded bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2 bg-gray-800 rounded">
              {mathSymbolResults.map((symbol, i) => (
                <button 
                  key={i}
                  className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    insertMathSymbol(symbol.symbol);
                  }}
                  title={symbol.symbol}
                >
                  {symbol.display}
                </button>
              ))}
              {mathSymbolResults.length === 0 && (
                <div className="w-full text-center py-2 text-sm text-gray-400">
                  No symbols found
                </div>
              )}
            </div>
          </div>
          
          {/* Common LaTeX patterns */}
          <div className="mt-3">
            <div className="text-xs text-gray-400 mb-1">Common Patterns</div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Fraction', pattern: '\\frac{num}{den}' },
                { label: 'Square Root', pattern: '\\sqrt{x}' },
                { label: 'Summation', pattern: '\\sum_{i=1}^{n} x_i' },
                { label: 'Integral', pattern: '\\int_{a}^{b} f(x) dx' }
              ].map((pattern, i) => (
                <button 
                  key={i}
                  className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    insertMathSymbol(pattern.pattern);
                  }}
                >
                  {pattern.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="w-full relative z-50">
      <form 
        onSubmit={handleSubmit}
        className="py-1 relative"
      >
        <div 
          ref={containerRef}
          className={`relative transition-all duration-300 rounded-2xl overflow-hidden ${
            isFocused 
              ? 'ring-2 ring-opacity-70 translate-y-0' 
              : 'ring-1 ring-opacity-30 translate-y-0'
          } ${isTyping ? 'is-typing' : ''}`}
          style={{ 
            backgroundColor: currentTheme.colors.bgSecondary,
            boxShadow: isFocused 
              ? `0 0 0 2px ${currentTheme.colors.accentPrimary}40, 0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)` 
              : '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
            ringColor: isFocused 
              ? currentTheme.colors.accentPrimary
              : currentTheme.colors.borderColor,
          }}
        >
          {/* Ambient gradient effects */}
          <div 
            className={`absolute inset-0 opacity-10 pointer-events-none transition-opacity duration-500 ${isFocused ? 'opacity-20' : 'opacity-10'}`}
            style={{ 
              backgroundImage: `
                radial-gradient(circle at 20% 20%, ${currentTheme.colors.accentPrimary}30 0%, transparent 70%),
                radial-gradient(circle at 80% 80%, ${currentTheme.colors.accentSecondary}30 0%, transparent 70%)
              `,
            }}
          />
          
          {/* Top highlight bar animation */}
          <div 
            className={`absolute top-0 left-0 right-0 h-0.5 transition-opacity duration-300 ${isFocused ? 'opacity-100' : 'opacity-0'}`}
            style={{
              background: `linear-gradient(to right, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary}, ${currentTheme.colors.accentPrimary})`,
              backgroundSize: '200% 100%',
              animation: isFocused ? 'gradientAnimation 6s ease infinite' : 'none'
            }}
          />
          
          {/* Cursor glow effect */}
          {cursorPosition && isFocused && !isGenerating && activeEditor.type === null && (
            <div 
              className="absolute pointer-events-none transition-all duration-200 ease-out"
              style={{
                left: `${cursorPosition.left}px`,
                top: `${cursorPosition.top}px`,
                width: '2px',
                height: '1.2em',
                transform: 'translateY(-50%)',
                background: currentTheme.colors.accentPrimary,
                boxShadow: `0 0 10px 2px ${currentTheme.colors.accentPrimary}80`,
                opacity: 0.8,
                animation: 'blink 1s ease-in-out infinite'
              }}
            />
          )}
          
          {/* Hidden textarea for managing input */}
          <textarea 
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onScroll={handleScroll}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            disabled={disabled}
            placeholder={isGenerating ? "AI is generating..." : placeholder}
            rows={1}
            className="w-full px-4 pt-3.5 pb-2 resize-none overflow-auto focus:outline-none z-10 absolute opacity-0"
            style={{ 
              backgroundColor: 'transparent',
              color: 'transparent',
              caretColor: currentTheme.colors.accentPrimary,
              maxHeight: '200px',
            }}
          />
          
          {/* Content Preview Layer */}
          {renderPreview()}
          
          {/* Active Editor Layer */}
          {renderActiveEditor()}
          
          <div className="px-3 pb-2.5 flex justify-between items-center relative z-10">
            <div className="opacity-70 flex-1 text-center" style={{ color: currentTheme.colors.textMuted }}>
              <div className="text-xs flex items-center justify-center">
                <kbd className="px-1.5 py-0.5 rounded text-[10px] font-medium mr-1"
                  style={{
                    backgroundColor: `${currentTheme.colors.bgTertiary}80`,
                    color: currentTheme.colors.textSecondary,
                    border: `1px solid ${currentTheme.colors.borderColor}40`,
                  }}
                >
                  Shift
                </kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded text-[10px] font-medium mx-1"
                  style={{
                    backgroundColor: `${currentTheme.colors.bgTertiary}80`,
                    color: currentTheme.colors.textSecondary,
                    border: `1px solid ${currentTheme.colors.borderColor}40`,
                  }}
                >
                  ↵
                </kbd>
                <span className="ml-1 text-xs">for line break</span>
              </div>
            </div>
            
            <Button
              disabled={disabled || !message.trim() || isComposing}
              type="submit"
              size="sm"
              className={`rounded-full py-2 px-4 transition-all ${
                !message.trim() || isComposing ? 'opacity-50' : 'opacity-100 hover:scale-[1.03] hover:shadow-lg active:scale-[0.97]'
              }`}
              style={{ 
                background: message.trim() && !isComposing
                  ? `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})` 
                  : `${currentTheme.colors.bgTertiary}`,
                color: message.trim() && !isComposing ? '#fff' : currentTheme.colors.textMuted,
                boxShadow: message.trim() && !isComposing ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
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
            </Button>
          </div>
          
          {/* Bottom shine effect */}
          <div 
            className={`absolute bottom-0 left-0 right-0 h-40 pointer-events-none transition-opacity duration-300 ${isTyping ? 'opacity-15' : 'opacity-0'}`}
            style={{
              background: `radial-gradient(ellipse at bottom, ${currentTheme.colors.accentPrimary}40, transparent)`,
              transform: 'translateY(65%)'
            }}
          />
        </div>
      </form>
    </div>
  );
};

export default ChatInput;