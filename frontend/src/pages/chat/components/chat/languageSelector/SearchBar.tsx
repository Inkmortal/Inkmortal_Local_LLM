import React, { useRef, useEffect } from 'react';
import { useTheme } from '../../../../../context/ThemeContext';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  searchQuery, 
  setSearchQuery, 
  onKeyDown 
}) => {
  const { currentTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the search input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div 
      className="p-2 relative mb-2" 
      style={{ 
        borderBottom: `1px solid ${currentTheme.colors.borderColor}30` 
      }}
    >
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="w-full py-1.5 px-3 pl-8 text-sm rounded-md transition-all"
          placeholder="Search languages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={onKeyDown}
          style={{
            backgroundColor: `${currentTheme.colors.bgTertiary}50`,
            color: currentTheme.colors.textPrimary,
            border: `1px solid ${currentTheme.colors.borderColor}40`,
          }}
        />
        <svg
          className="w-4 h-4 absolute left-2 top-2 opacity-70"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          style={{ color: currentTheme.colors.textMuted }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {searchQuery && (
          <button
            className="absolute right-2 top-2 opacity-70 hover:opacity-100 transition-opacity"
            onClick={() => setSearchQuery('')}
            style={{ color: currentTheme.colors.textMuted }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;