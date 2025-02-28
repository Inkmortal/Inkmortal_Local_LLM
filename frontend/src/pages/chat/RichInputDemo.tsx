import React, { useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import ChatInput from '../../components/chat/ChatInput';
import MessageParser from '../../components/chat/MessageParser';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

const RichInputDemo: React.FC = () => {
  const { currentTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Refs for code and math insertion
  const codeInsertRef = useRef<((codeSnippet: string) => void)>();
  const mathInsertRef = useRef<((mathSnippet: string) => void)>();
  
  // Handle sending a message
  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Simulate assistant response
    setIsGenerating(true);
    setTimeout(() => {
      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I've received your message with rich formatting. Try inserting code with ``` or math with $ symbols!",
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, responseMessage]);
      setIsGenerating(false);
    }, 1500);
  };
  
  // Handle code insertion
  const handleInsertCode = (language = 'javascript', template = '') => {
    const codeBlock = 
      '```' + language + '\n' + 
      (template || '// Your code here\nconsole.log("Hello world!");') + 
      '\n```';
    
    if (codeInsertRef.current) {
      codeInsertRef.current(codeBlock);
    }
  };
  
  // Handle math insertion
  const handleInsertMath = (formula = '') => {
    const mathBlock = formula ? 
      '$' + formula + '$' : 
      '$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$';
    
    if (mathInsertRef.current) {
      mathInsertRef.current(mathBlock);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="p-4 border-b" style={{ backgroundColor: currentTheme.colors.bgSecondary }}>
        <h1 className="text-2xl font-bold mb-2" style={{ color: currentTheme.colors.textPrimary }}>
          Rich Input Demo
        </h1>
        <p className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
          This page demonstrates rich input with code and math formatting
        </p>
        <div className="flex mt-3 space-x-2">
          <button 
            onClick={() => handleInsertCode()}
            className="px-3 py-1 text-sm rounded" 
            style={{ 
              backgroundColor: currentTheme.colors.accentPrimary,
              color: '#fff'
            }}
          >
            Insert Code
          </button>
          <button 
            onClick={() => handleInsertMath()}
            className="px-3 py-1 text-sm rounded" 
            style={{ 
              backgroundColor: currentTheme.colors.accentSecondary,
              color: '#fff'
            }}
          >
            Insert Math
          </button>
        </div>
      </header>
      
      <div className="flex-1 p-4 overflow-auto">
        {messages.length === 0 ? (
          <div 
            className="text-center py-10 opacity-50"
            style={{ color: currentTheme.colors.textMuted }}
          >
            Send a message to start a conversation
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(message => (
              <div 
                key={message.id}
                className={`p-4 rounded-lg max-w-3xl ${
                  message.role === 'user' ? 'ml-auto bg-blue-600 text-white' : 'bg-gray-700 text-white'
                }`}
              >
                <MessageParser content={message.content} />
                <div className="mt-2 pt-2 border-t border-white/20 text-xs opacity-70">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-4" style={{ backgroundColor: currentTheme.colors.bgSecondary }}>
        <div className="max-w-3xl mx-auto">
          <ChatInput 
            onSend={handleSendMessage}
            placeholder="Type a message with rich formatting..."
            isGenerating={isGenerating}
            onInsertCode={(fn) => {
              codeInsertRef.current = fn;
            }}
            onInsertMath={(fn) => {
              mathInsertRef.current = fn;
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default RichInputDemo;