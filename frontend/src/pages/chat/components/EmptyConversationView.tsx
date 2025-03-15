import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import ChatInputAdapterWithStop from '../../../components/chat/ChatInputAdapterWithStop';

interface SuggestionProps {
  title: string;
  examples: string[];
  icon: string;
  onClick: (prompt: string) => void;
}

const Suggestion: React.FC<SuggestionProps> = ({ title, examples, icon, onClick }) => {
  return (
    <div className="flex flex-col space-y-2 bg-opacity-5 bg-white dark:bg-opacity-5 dark:bg-gray-500 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center mb-2">
        <span className="text-2xl mr-2">{icon}</span>
        <h3 className="text-lg font-medium">{title}</h3>
      </div>
      <div className="space-y-2">
        {examples.map((example, index) => (
          <button
            key={index}
            onClick={() => onClick(example)}
            className="w-full text-left p-2 px-3 rounded-md bg-opacity-10 bg-black dark:bg-opacity-10 dark:bg-white hover:bg-opacity-20 transition-all duration-150 cursor-pointer"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
};

interface EmptyConversationViewProps {
  onSendMessage: (message: string, file?: File | null) => Promise<void>;
}

const EmptyConversationView: React.FC<EmptyConversationViewProps> = ({ onSendMessage }) => {
  const { currentTheme } = useTheme();
  
  // Safely check if theme is dark by first ensuring currentTheme is properly loaded
  const isDark = currentTheme && (
    (typeof currentTheme.isDark === 'boolean' && currentTheme.isDark) || 
    (currentTheme.name && typeof currentTheme.name === 'string' && (
      currentTheme.name.includes('dark') || 
      currentTheme.name.includes('night') || 
      currentTheme.name.includes('dracula')
    ))
  );
  
  const handlePromptClick = (prompt: string) => {
    onSendMessage(prompt);
  };

  const suggestions = [
    {
      title: "Education",
      icon: "🎓",
      examples: [
        "Explain quantum computing in simple terms",
        "How do black holes work?",
        "What's the difference between DNA and RNA?"
      ]
    },
    {
      title: "Programming",
      icon: "💻",
      examples: [
        "Write a Python function to detect palindromes",
        "Explain how React hooks work",
        "What's the difference between SQL and NoSQL databases?"
      ]
    },
    {
      title: "Mathematics",
      icon: "🔢",
      examples: [
        "Explain the Riemann hypothesis",
        "Help me understand calculus derivatives",
        "Solve this equation: 3x² + 5x - 2 = 0"
      ]
    },
    {
      title: "Writing",
      icon: "✏️",
      examples: [
        "Help me structure an essay about climate change",
        "Proofread this paragraph for me",
        "Suggest improvements for my research methodology"
      ]
    }
  ];

  return (
    <div className="flex flex-col items-center w-full h-full max-w-chat mx-auto px-4 py-6">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Inkmortal LLM</h1>
        <p className="text-base opacity-80 max-w-2xl">
          Your personal AI assistant for education, programming, and more. Ask anything or try one of the suggestions below.
        </p>
      </div>

      {/* Capability Cards */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {suggestions.map((suggestion, index) => (
          <Suggestion
            key={index}
            title={suggestion.title}
            examples={suggestion.examples}
            icon={suggestion.icon}
            onClick={handlePromptClick}
          />
        ))}
      </div>

      {/* Capabilities Section */}
      <div className="w-full max-w-3xl rounded-lg p-4 border border-opacity-20 border-gray-400 dark:border-gray-600">
        <h2 className="text-lg font-medium mb-3 flex items-center">
          <span className="mr-2">💡</span> Capabilities & Limitations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Inkmortal LLM can:</h3>
            <ul className="space-y-1 list-disc pl-5 text-sm">
              <li>Answer questions about any knowledge domain</li>
              <li>Remember your earlier messages in the conversation</li>
              <li>Generate code and solve programming problems</li>
              <li>Help with math problems and scientific concepts</li>
              <li>Provide guidance on writing and research</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Limitations:</h3>
            <ul className="space-y-1 list-disc pl-5 text-sm">
              <li>May occasionally generate incorrect information</li>
              <li>Has limited knowledge of world events after training data cutoff</li>
              <li>May not always understand complex or ambiguous questions</li>
              <li>Cannot browse the internet or access external files</li>
              <li>Should not be relied upon for critical decisions</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="w-full max-w-3xl mt-6 text-center">
        <p className="opacity-75 text-xs">
          💬 Type your message in the box below to start a conversation • 📁 You can also upload files for analysis • ✨ Be specific with your questions for better results
        </p>
      </div>
      
      {/* Chat Input */}
      <div className="w-full max-w-3xl mt-4 px-4">
        <ChatInputAdapterWithStop
          onSendMessage={onSendMessage}
          onStopGeneration={() => {}}
          placeholder="Send a message to start a new conversation..."
          isGenerating={false}
        />
      </div>
      
      {/* Loading indicator state explanation */}
      <div className="w-full max-w-3xl mt-2 text-center">
        <p className="text-xs opacity-70">
          💡 After sending a message, please wait briefly while the conversation is established
        </p>
      </div>
    </div>
  );
};

export default EmptyConversationView;