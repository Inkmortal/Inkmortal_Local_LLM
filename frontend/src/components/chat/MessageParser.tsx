import React, { ReactNode } from 'react';
import MathRenderer from '../education/MathRenderer';
import CodeBlock from '../education/CodeBlock';

interface MessageParserProps {
  content: string;
}

const MessageParser: React.FC<MessageParserProps> = ({ content }) => {
  // Parse the message content and return formatted components
  const parseContent = (text: string): ReactNode[] => {
    const elements: ReactNode[] = [];
    let currentIndex = 0;
    let key = 0;
    
    // Regular expressions for different content types
    const codeBlockRegex = /```([\w-]+)?\n([\s\S]*?)```/g;
    const inlineCodeRegex = /`([^`]+)`/g;
    const displayMathRegex = /\$\$([\s\S]*?)\$\$/g;
    const inlineMathRegex = /\$([^$]+)\$/g;
    
    // Store all matches with their positions
    const allMatches: {start: number; end: number; content: ReactNode}[] = [];
    
    // Find code blocks
    let codeMatch;
    while ((codeMatch = codeBlockRegex.exec(text)) !== null) {
      const language = codeMatch[1] || 'javascript';
      const code = codeMatch[2];
      allMatches.push({
        start: codeMatch.index,
        end: codeMatch.index + codeMatch[0].length,
        content: <CodeBlock key={`code-${key++}`} code={code} language={language} className="my-2" />
      });
    }
    
    // Find inline code
    let inlineCodeMatch;
    while ((inlineCodeMatch = inlineCodeRegex.exec(text)) !== null) {
      // Ignore matches that are inside code blocks
      const insideCodeBlock = allMatches.some(
        match => inlineCodeMatch!.index > match.start && inlineCodeMatch!.index < match.end
      );
      
      if (!insideCodeBlock) {
        allMatches.push({
          start: inlineCodeMatch.index,
          end: inlineCodeMatch.index + inlineCodeMatch[0].length,
          content: (
            <code key={`inline-code-${key++}`} className="px-1 py-0.5 rounded text-sm bg-gray-800 font-mono">
              {inlineCodeMatch[1]}
            </code>
          )
        });
      }
    }
    
    // Find display math
    let displayMathMatch;
    while ((displayMathMatch = displayMathRegex.exec(text)) !== null) {
      // Ignore matches that are inside code blocks
      const insideOtherBlock = allMatches.some(
        match => displayMathMatch!.index > match.start && displayMathMatch!.index < match.end
      );
      
      if (!insideOtherBlock) {
        allMatches.push({
          start: displayMathMatch.index,
          end: displayMathMatch.index + displayMathMatch[0].length,
          content: <MathRenderer key={`math-display-${key++}`} latex={displayMathMatch[1]} display={true} />
        });
      }
    }
    
    // Find inline math
    let inlineMathMatch;
    while ((inlineMathMatch = inlineMathRegex.exec(text)) !== null) {
      // Ignore matches that are inside other blocks
      const insideOtherBlock = allMatches.some(
        match => inlineMathMatch!.index > match.start && inlineMathMatch!.index < match.end
      );
      
      if (!insideOtherBlock) {
        allMatches.push({
          start: inlineMathMatch.index,
          end: inlineMathMatch.index + inlineMathMatch[0].length,
          content: <MathRenderer key={`math-inline-${key++}`} latex={inlineMathMatch[1]} display={false} />
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
  };
  
  return (
    <div className="message-content">
      {parseContent(content)}
    </div>
  );
};

export default MessageParser;