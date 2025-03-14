import React, { ReactNode, useMemo, useEffect, useState, useRef } from 'react';
import parse from 'html-react-parser';
import MathRenderer from '../education/MathRenderer';
import CodeBlock from '../education/CodeBlock';

// Define types for HTML React Parser
interface HTMLElement {
  type: 'tag';
  name: string;
  attribs: Record<string, string>;
  children: Array<HTMLElement | TextNode>;
}

interface TextNode {
  type: 'text';
  data: string;
}

interface MatchedElement {
  start: number;
  end: number;
  content: ReactNode;
}

interface MessageParserProps {
  content: string;
  isStreaming?: boolean;
}

// Maximum content size before chunking for performance
const MAX_CONTENT_SIZE = 10000;

const MessageParser: React.FC<MessageParserProps> = ({ content, isStreaming = false }) => {
  // Track the previously rendered content to identify new tokens
  const [previousContent, setPreviousContent] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Update previous content after rendering
  useEffect(() => {
    if (!isStreaming) {
      // If not streaming, just set the entire content as previous
      setPreviousContent(content);
    } else if (content.length > previousContent.length) {
      // Only update previous content if new content is longer (streaming is happening)
      setPreviousContent(content);
    }
  }, [content, isStreaming, previousContent]);

  // Process content with memoization to prevent re-parsing on every render
  const parsedContent = useMemo(() => {
    // Check if content is HTML or plain text
    const isHTML = content.trim().startsWith('<') && content.trim().endsWith('>');
    
    // For very large content, use simpler parsing to prevent freezing
    if (content.length > MAX_CONTENT_SIZE) {
      return parseAsPlainText(content, isStreaming, previousContent);
    }
    
    if (isHTML) {
      try {
        return parseAsHTML(content);
      } catch (error) {
        console.error('Error parsing HTML content:', error);
        // Fallback to plain text parsing if HTML parsing fails
        return parseAsPlainText(content, isStreaming, previousContent);
      }
    }
    
    // For regular content, use the optimized parser
    return parseAsPlainText(content, isStreaming, previousContent);
  }, [content, isStreaming, previousContent]);

  // Add a streaming cursor at the end if streaming
  const renderContent = useMemo(() => {
    if (isStreaming) {
      return (
        <div className="streaming-container">
          {parsedContent}
          <span className="streaming-cursor"></span>
        </div>
      );
    }
    return parsedContent;
  }, [parsedContent, isStreaming]);

  return (
    <div className={"markdown-content " + (isStreaming ? "streaming-text" : "")} ref={contentRef}>
      {renderContent}
    </div>
  );
};

// Parse content as HTML using html-react-parser
function parseAsHTML(content: string): ReactNode {
  const parseOptions = {
    replace: (domNode: HTMLElement | TextNode) => {
      if (domNode.type !== 'tag') return undefined;
      
      const element = domNode as HTMLElement;
      
      // Handle math blocks
      if (element.name === 'div' && 
          element.attribs && 
          element.attribs['data-type'] === 'math-block') {
        let latex = '';
        const textNode = element.children?.find(child => child.type === 'text');
        if (textNode && textNode.type === 'text') {
          latex = textNode.data || '';
        }
        return <MathRenderer latex={latex} display={true} />;
      }
      
      // Handle code blocks
      if (element.name === 'pre' && 
          element.attribs && 
          element.attribs['data-language']) {
        const language = element.attribs['data-language'];
        let code = '';
        
        // Extract code from <code> child if exists
        const codeElement = element.children?.find(child => 
          child.type === 'tag' && (child as HTMLElement).name === 'code'
        ) as HTMLElement | undefined;
        
        if (codeElement) {
          const textNode = codeElement.children?.find(child => child.type === 'text');
          if (textNode && textNode.type === 'text') {
            code = textNode.data || '';
          }
        }
        
        return <CodeBlock code={code} language={language} />;
      }
      
      return undefined;
    }
  };

  return parse(content, parseOptions);
}

// Parse markdown-like syntax in plain text with streaming support
function parseAsPlainText(text: string, isStreaming = false, previousText = ""): ReactNode[] {
  const elements: ReactNode[] = [];
  let currentIndex = 0;
  let key = 0;
  const allMatches: MatchedElement[] = [];
  
  // Helper function to preserve line breaks in text content
  const preserveLineBreaks = (content: string): ReactNode => {
    if (!content.includes('\n')) return content;
    
    // Split by newlines and create fragments with <br/> elements
    return content.split('\n').map((line, i) => (
      <React.Fragment key={`line-${i}`}>
        {i > 0 && <br />}
        {line}
      </React.Fragment>
    ));
  };
  
  // Find all special elements in a single pass
  findSpecialElements(text, allMatches, key);
  
  // Sort matches by start position
  allMatches.sort((a, b) => a.start - b.start);
  
  // Build the result by combining text and special elements
  for (let i = 0; i < allMatches.length; i++) {
    const match = allMatches[i];
    
    // Add text before the match
    if (match.start > currentIndex) {
      const textBeforeMatch = text.substring(currentIndex, match.start);
      
      if (isStreaming && previousText.length < text.length) {
        // For streaming, split the text to highlight new tokens
        // Compare only the relevant portion of previous text starting from currentIndex
        const previousTextSegment = previousText.substring(currentIndex);
        const commonLength = Math.min(previousTextSegment.length, textBeforeMatch.length);
        
        if (commonLength > 0) {
          // Add previously rendered text with preserved line breaks
          elements.push(preserveLineBreaks(textBeforeMatch.substring(0, commonLength)));
        }
        
        if (commonLength < textBeforeMatch.length) {
          // Add newly streamed text with highlight and preserved line breaks
          elements.push(
            <span key={`new-${match.start}`} className="new-token">
              {preserveLineBreaks(textBeforeMatch.substring(commonLength))}
            </span>
          );
        }
      } else {
        // Regular rendering with preserved line breaks
        elements.push(preserveLineBreaks(textBeforeMatch));
      }
    }
    
    // Add the special element
    elements.push(match.content);
    
    // Update the current index
    currentIndex = match.end;
  }
  
  // Add any remaining text
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex);
    
    if (isStreaming && previousText.length < text.length) {
      // For streaming, split the remaining text to highlight new tokens
      // Compare only the relevant portion of previous text starting from currentIndex
      const previousTextSegment = previousText.substring(currentIndex);
      const commonLength = Math.min(previousTextSegment.length, remainingText.length);
      
      if (commonLength > 0 && commonLength <= remainingText.length) {
        // Add previously rendered text with preserved line breaks
        elements.push(preserveLineBreaks(remainingText.substring(0, commonLength)));
      }
      
      if (commonLength < remainingText.length) {
        // Add newly streamed text with highlight and preserved line breaks
        elements.push(
          <span key="new-remaining" className="new-token">
            {preserveLineBreaks(remainingText.substring(commonLength))}
          </span>
        );
      }
    } else {
      // Regular rendering with preserved line breaks
      elements.push(preserveLineBreaks(remainingText));
    }
  }
  
  return elements;
}

// Find all special elements in a single pass
function findSpecialElements(text: string, matches: MatchedElement[], startKey: number): number {
  let key = startKey;
  
  // Find code blocks (most specific first to avoid inner matching)
  // Regex patterns - improved to better preserve whitespace and line breaks
  const patterns = [
    {
      regex: /```([\w-]+)?\n([\s\S]*?)```/g,
      process: (match: RegExpExecArray) => {
        const language = match[1] || 'text';
        // Preserve exact whitespace without trimming
        const code = match[2].replace(/\n+$/, ''); // Only trim trailing newlines
        return <CodeBlock key={`code-${key++}`} code={code} language={language} className="my-2" />;
      }
    },
    {
      regex: /\$\$([\s\S]*?)\$\$/g,
      process: (match: RegExpExecArray) => {
        return <MathRenderer key={`math-display-${key++}`} latex={match[1]} display={true} />;
      }
    },
    {
      regex: /`([^`]+)`/g,
      process: (match: RegExpExecArray) => {
        return (
          <code key={`inline-code-${key++}`} className="px-1 py-0.5 rounded text-sm bg-gray-800 font-mono">
            {match[1]}
          </code>
        );
      }
    },
    {
      regex: /\$([^$]+)\$/g,
      process: (match: RegExpExecArray) => {
        return <MathRenderer key={`math-inline-${key++}`} latex={match[1]} display={false} />;
      }
    }
  ];
  
  // Process each pattern independently to avoid nested regex complexity
  patterns.forEach(({ regex, process }) => {
    let match;
    while ((match = regex.exec(text)) !== null) {
      // Check if this match is inside any existing match
      const isInsideExistingMatch = matches.some(
        existing => match!.index > existing.start && match!.index < existing.end
      );
      
      if (!isInsideExistingMatch) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          content: process(match)
        });
      }
    }
  });
  
  return key;
}

export default React.memo(MessageParser);