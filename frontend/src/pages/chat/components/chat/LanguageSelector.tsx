import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import Button from '../../../../components/ui/Button';

interface Language {
  name: string;
  value: string;
  icon?: string;
}

interface CodeTemplate {
  language: string;
  template: string;
}

interface LanguageSelectorProps {
  onSelect: (language: string, template: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  onSelect,
  onClose,
  isOpen
}) => {
  const { currentTheme } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Common programming languages
  const languages: Language[] = [
    { name: 'JavaScript', value: 'javascript' },
    { name: 'Python', value: 'python' },
    { name: 'Java', value: 'java' },
    { name: 'C++', value: 'cpp' },
    { name: 'TypeScript', value: 'typescript' },
    { name: 'HTML', value: 'html' },
    { name: 'CSS', value: 'css' },
    { name: 'Ruby', value: 'ruby' },
    { name: 'Go', value: 'go' },
    { name: 'Rust', value: 'rust' },
    { name: 'PHP', value: 'php' },
    { name: 'Swift', value: 'swift' },
    { name: 'Kotlin', value: 'kotlin' },
    { name: 'C#', value: 'csharp' },
    { name: 'R', value: 'r' },
    { name: 'Shell/Bash', value: 'bash' },
    { name: 'SQL', value: 'sql' },
    { name: 'JSON', value: 'json' },
    { name: 'YAML', value: 'yaml' },
    { name: 'Markdown', value: 'markdown' }
  ];
  
  // Code templates for different languages
  const templates: Record<string, string> = {
    javascript: `function example() {
  // Your code here
  return true;
}`,
    python: `def example():
    # Your code here
    return True`,
    java: `public class Example {
    public static void main(String[] args) {
        // Your code here
    }
}`,
    cpp: `#include <iostream>

int main() {
    // Your code here
    return 0;
}`,
    typescript: `function example(): boolean {
  // Your code here
  return true;
}`,
    html: `<!DOCTYPE html>
<html>
<head>
    <title>Example</title>
</head>
<body>
    <!-- Your content here -->
</body>
</html>`,
    css: `/* Your styles here */
.container {
    display: flex;
    justify-content: center;
}`,
    ruby: `def example
  # Your code here
  true
end`,
    go: `package main

import "fmt"

func main() {
  // Your code here
}`,
    rust: `fn main() {
    // Your code here
}`,
    php: `<?php
function example() {
    // Your code here
    return true;
}
?>`,
    swift: `func example() -> Bool {
    // Your code here
    return true
}`,
    kotlin: `fun example(): Boolean {
    // Your code here
    return true
}`,
    csharp: `using System;

class Program {
    static void Main() {
        // Your code here
    }
}`,
    r: `# R function example
example <- function() {
  # Your code here
  return(TRUE)
}`,
    bash: `#!/bin/bash
# Your shell script here
echo "Hello World"`,
    sql: `SELECT column_name
FROM table_name
WHERE condition;`,
    json: `{
  "key": "value",
  "numbers": [1, 2, 3],
  "nested": {
    "property": true
  }
}`,
    yaml: `# Example YAML
version: '3'
services:
  app:
    image: example:latest
    ports:
      - "8080:8080"`,
    markdown: `# Heading

## Subheading

- List item 1
- List item 2

\`\`\`
code block
\`\`\`

**Bold text** and *italic text*`
  };

  // Filter languages based on search
  const filteredLanguages = languages.filter(lang => 
    lang.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle clicks outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredLanguages.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          if (filteredLanguages.length > 0) {
            e.preventDefault();
            const selected = filteredLanguages[selectedIndex];
            onSelect(selected.value, templates[selected.value] || '');
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onSelect, selectedIndex, filteredLanguages, templates]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div 
      className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-50"
      style={{
        maxWidth: '350px',
        width: '90%'
      }}
    >
      <div 
        ref={containerRef}
        className="rounded-lg shadow-xl overflow-hidden"
        style={{
          backgroundColor: currentTheme.colors.bgSecondary,
          border: `1px solid ${currentTheme.colors.borderColor}`,
          boxShadow: `0 6px 16px rgba(0, 0, 0, 0.12), 0 3px 6px rgba(0, 0, 0, 0.08)`
        }}
      >
        <div 
          className="px-4 py-2 font-medium border-b"
          style={{
            borderColor: currentTheme.colors.borderColor,
            color: currentTheme.colors.textPrimary,
            backgroundColor: `${currentTheme.colors.accentPrimary}10`
          }}
        >
          Select Programming Language
        </div>
        
        <div className="p-2">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search languages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded border text-sm"
            style={{
              backgroundColor: `${currentTheme.colors.bgPrimary}90`,
              borderColor: currentTheme.colors.borderColor,
              color: currentTheme.colors.textPrimary,
              outline: 'none'
            }}
          />
        </div>
        
        <div 
          className="max-h-60 overflow-y-auto modern-scrollbar"
          style={{ color: currentTheme.colors.textPrimary }}
        >
          {filteredLanguages.length > 0 ? (
            filteredLanguages.map((language, index) => (
              <div
                key={language.value}
                className={`px-4 py-2 cursor-pointer hover:bg-opacity-70 transition-colors flex items-center ${
                  selectedIndex === index ? 'bg-opacity-100' : 'bg-opacity-0'
                }`}
                style={{
                  backgroundColor: selectedIndex === index 
                    ? `${currentTheme.colors.accentPrimary}15` 
                    : 'transparent',
                  borderLeft: selectedIndex === index 
                    ? `2px solid ${currentTheme.colors.accentPrimary}` 
                    : '2px solid transparent'
                }}
                onClick={() => {
                  onSelect(language.value, templates[language.value] || '');
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="font-medium">{language.name}</div>
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-center text-sm italic" style={{ color: currentTheme.colors.textMuted }}>
              No languages found
            </div>
          )}
        </div>
        
        <div 
          className="px-4 py-2 border-t flex justify-end gap-2"
          style={{ borderColor: currentTheme.colors.borderColor }}
        >
          <Button 
            size="sm" 
            variant="ghost"
            onClick={onClose}
            style={{ color: currentTheme.colors.textSecondary }}
          >
            Cancel
          </Button>
          <Button 
            size="sm"
            onClick={() => {
              if (filteredLanguages.length > 0) {
                const selected = filteredLanguages[selectedIndex];
                onSelect(selected.value, templates[selected.value] || '');
                onClose();
              }
            }}
            disabled={filteredLanguages.length === 0}
            style={{
              background: filteredLanguages.length > 0 
                ? `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`
                : currentTheme.colors.bgTertiary,
              color: filteredLanguages.length > 0 ? '#fff' : currentTheme.colors.textMuted
            }}
          >
            Insert
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelector;