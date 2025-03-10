import React, { ReactNode, useMemo } from 'react';
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
}

// Maximum content size before chunking for performance
const MAX_CONTENT_SIZE = 10000;

const MessageParser: React.FC<MessageParserProps> = ({ content }) => {
  // Process content with memoization to prevent re-parsing on every render
  const parsedContent = useMemo(() => {
    // Check if content is HTML or plain text
    const isHTML = content.trim().startsWith('<') && content.trim().endsWith('>');
    
    // For very large content, use simpler parsing to prevent freezing
    if (content.length > MAX_CONTENT_SIZE) {
      return parseAsPlainText(content);
    }
    
    if (isHTML) {
      try {
        return parseAsHTML(content);
      } catch (error) {
        console.error('Error parsing HTML content:', error);
        // Fallback to plain text parsing if HTML parsing fails
        return parseAsPlainText(content);
      }
    }
    
    // For regular content, use the optimized parser
    return parseAsPlainText(content);
  }, [content]);

  return <div className="message-content">{parsedContent}</div>;
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

// Parse markdown-like syntax in plain text
function parseAsPlainText(text: string): ReactNode[] {
  const elements: ReactNode[] = [];
  let currentIndex = 0;
  let key = 0;
  const allMatches: MatchedElement[] = [];
  
  // Find all special elements in a single pass
  findSpecialElements(text, allMatches, key);
  
  // Sort matches by start position
  allMatches.sort((a, b) => a.start - b.start);
  
  // Build the result by combining text and special elements
  for (let i = 0; i < allMatches.length; i++) {
    const match = allMatches[i];
    
    // Add text before the match
    if (match.start > currentIndex) {
      elements.push(text.substring(currentIndex, match.start));
    }
    
    // Add the special element
    elements.push(match.content);
    
    // Update the current index
    currentIndex = match.end;
  }
  
  // Add any remaining text
  if (currentIndex < text.length) {
    elements.push(text.substring(currentIndex));
  }
  
  return elements;
}

// Find all special elements in a single pass
function findSpecialElements(text: string, matches: MatchedElement[], startKey: number): number {
  let key = startKey;
  
  // Find code blocks (most specific first to avoid inner matching)
  // Regex patterns
  const patterns = [
    {
      regex: /```([\w-]+)?\n([\s\S]*?)```/g,
      process: (match: RegExpExecArray) => {
        const language = match[1] || 'text';
        const code = match[2];
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