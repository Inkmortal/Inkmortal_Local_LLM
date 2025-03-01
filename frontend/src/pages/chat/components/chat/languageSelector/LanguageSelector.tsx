import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../../context/ThemeContext';
import SearchBar from './SearchBar';
import LanguageList from './LanguageList';
import TemplatePreview from './TemplatePreview';
import { Language, CodeTemplate, languageOptions, templates } from './types';

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

  // Filter languages based on search query
  const filteredLanguages = languageOptions.filter(lang =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get the currently selected template
  const selectedTemplate: CodeTemplate | null =
    filteredLanguages.length > 0
      ? {
          language: filteredLanguages[selectedIndex].name,
          template: templates[filteredLanguages[selectedIndex].value] || ''
        }
      : null;

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredLanguages.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredLanguages.length > 0 && selectedTemplate) {
          handleInsert();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  // Insert the selected template
  const handleInsert = () => {
    if (selectedTemplate) {
      onSelect(
        filteredLanguages[selectedIndex].value,
        selectedTemplate.template
      );
      onClose();
    }
  };

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
    >
      <div
        ref={containerRef}
        className="w-full max-w-md rounded-lg shadow-xl border overflow-hidden"
        style={{
          backgroundColor: currentTheme.colors.bgPrimary,
          borderColor: `${currentTheme.colors.borderColor}30`,
        }}
      >
        <SearchBar 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          onKeyDown={handleKeyDown} 
        />
        
        <LanguageList 
          languages={filteredLanguages} 
          selectedIndex={selectedIndex} 
          onSelectLanguage={setSelectedIndex} 
        />
        
        <TemplatePreview 
          selectedTemplate={selectedTemplate} 
          onInsert={handleInsert} 
        />
      </div>
    </div>
  );
};

export default LanguageSelector;