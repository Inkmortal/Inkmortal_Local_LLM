import React, { useState, useEffect, useRef } from 'react';
import MessageParser from './MessageParser';

/**
 * TokenAnimator component that creates a smooth character-by-character
 * animation effect for streaming text.
 */
interface TokenAnimatorProps {
  content: string;
  isStreaming: boolean;
  animationSpeed?: number; // Characters per second
}

const TokenAnimator: React.FC<TokenAnimatorProps> = ({
  content,
  isStreaming,
  animationSpeed = 50 // Default 50 characters per second
}) => {
  // State for the currently visible content
  const [visibleContent, setVisibleContent] = useState('');
  
  // Refs to track content and animation frame
  const contentRef = useRef(content);
  const indexRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  
  // Update content ref when content changes
  useEffect(() => {
    contentRef.current = content;
    
    // If not streaming, immediately show all content
    if (!isStreaming) {
      setVisibleContent(content);
      indexRef.current = content.length;
      return;
    }
    
    // If we're streaming and there's new content to animate
    if (content.length > indexRef.current) {
      // Calculate animation timing
      const frameDuration = 1000 / animationSpeed; // ms per character
      
      // Clear any existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      // Start time for the animation
      let lastTimeStamp: number | null = null;
      let elapsed = 0;
      
      // Animation function
      const animate = (timestamp: number) => {
        if (lastTimeStamp === null) {
          lastTimeStamp = timestamp;
        }
        
        elapsed += timestamp - lastTimeStamp;
        lastTimeStamp = timestamp;
        
        // If enough time has passed to show another character
        if (elapsed >= frameDuration) {
          const charsToAdd = Math.floor(elapsed / frameDuration);
          elapsed = elapsed % frameDuration;
          
          // Move the index forward and update visible content
          if (indexRef.current < contentRef.current.length) {
            const newIndex = Math.min(
              indexRef.current + charsToAdd, 
              contentRef.current.length
            );
            indexRef.current = newIndex;
            setVisibleContent(contentRef.current.slice(0, newIndex));
          }
        }
        
        // Continue animation if not at the end
        if (indexRef.current < contentRef.current.length) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      
      // Start the animation
      animationRef.current = requestAnimationFrame(animate);
    }
    
    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [content, isStreaming, animationSpeed]);
  
  return (
    <div className="token-animation-container">
      <div className={`token-animation ${isStreaming ? 'with-cursor' : ''}`}>
        <MessageParser content={visibleContent} isStreaming={isStreaming} />
      </div>
    </div>
  );
};

export default TokenAnimator;