import React from 'react';
import TipTapEditor from './editor/TipTapEditor';
import { useTheme } from '../../context/ThemeContext';
import '../styles/editor.css';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onInsertCode?: (codeSnippet: string) => void;
  onInsertMath?: (mathSnippet: string) => void;
  isGenerating?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  disabled = false, 
  placeholder = "Type a message...",
  isGenerating = false,
  // These are kept for interface compatibility but won't be used directly
  inputRef,
  onInsertCode,
  onInsertMath
}) => {
  const { currentTheme } = useTheme();

  // Handler for sending HTML content
  const handleSend = (html: string) => {
    // Convert HTML to the format expected by the backend
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
      
      <div className="text-xs text-center mt-2 opacity-70" style={{ color: currentTheme.colors.textMuted }}>
        <div className="text-xs flex items-center justify-center">
          <span>Use</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-medium mx-1"
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
          <span className="ml-1">for line break</span>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;