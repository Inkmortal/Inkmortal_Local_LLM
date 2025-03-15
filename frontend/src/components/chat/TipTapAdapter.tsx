import React, { useEffect } from 'react';
import TipTapEditor from './editor/TipTapEditor';
import { convertHtmlToMarkdown } from '../../utils/htmlToMarkdown';
import { useEditor } from '../../services/editor/EditorContext';

interface TipTapAdapterProps {
  onSendMessage: (message: string) => void;
  onStopGeneration?: () => void;
  onFileSelect?: (file: File) => void;
  placeholder?: string;
  isGenerating?: boolean;
  disabled?: boolean;
}

/**
 * Adapter component to use TipTap editor in the chat interface
 * Handles conversion from HTML to proper markdown format
 * Uses EditorContext for refs and editor functionality
 */
const TipTapAdapter: React.FC<TipTapAdapterProps> = ({
  onSendMessage,
  onStopGeneration,
  onFileSelect,
  placeholder = "Type a message...",
  isGenerating = false,
  disabled = false
}) => {
  // Get editor context
  const { codeInsertRef, mathInsertRef } = useEditor();
  
  // Convert TipTap HTML to markdown-style format
  const handleSend = (html: string) => {
    // Convert HTML to markdown-style text
    let markdown = convertHtmlToMarkdown(html);
    
    // Process code blocks with proper formatting
    markdown = markdown.replace(/```([a-z]*)\n([\s\S]*?)```/g, (match, language, code) => {
      // Format as ```language\ncode``` 
      return `\`\`\`${language || ''}\n${code.trim()}\n\`\`\``;
    });
    
    // Process math blocks to use $$ format
    markdown = markdown.replace(/<math-inline>([\s\S]*?)<\/math-inline>/g, (match, math) => {
      return `$${math.trim()}$`;
    });
    
    // Send the message
    onSendMessage(markdown);
  };

  return (
    <div className="tiptap-chat-input">
      <TipTapEditor
        onSend={handleSend}
        disabled={disabled}
        loading={false}
        placeholder={placeholder}
        isGenerating={isGenerating}
      />
    </div>
  );
};

export default TipTapAdapter;