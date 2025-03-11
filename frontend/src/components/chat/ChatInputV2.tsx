import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInputV2: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message here...'
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to measure scrollHeight correctly
    textarea.style.height = 'auto';
    
    // Set new height based on scrollHeight (content height)
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [message]);
  
  // Handle input changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  }, []);
  
  // Handle key presses
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter (but not with Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      if (message.trim() && !disabled) {
        onSendMessage(message);
        setMessage('');
      }
    }
  }, [message, disabled, onSendMessage]);
  
  // Handle send button click
  const handleSend = useCallback(() => {
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
      
      // Focus the textarea after sending
      textareaRef.current?.focus();
    }
  }, [message, disabled, onSendMessage]);
  
  return (
    <div className="chat-input">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="chat-textarea"
      />
      <button
        className="send-button"
        onClick={handleSend}
        disabled={disabled || !message.trim()}
      >
        Send
      </button>
    </div>
  );
};