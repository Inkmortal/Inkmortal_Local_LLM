import React from 'react';
import { CodeSnippetType } from '../types/SnippetTypes';
import { languageOptions } from '../data/LanguageOptions';

interface CodeEditorSidebarProps {
  currentTheme: any;
  language: string;
  setLanguage: (language: string) => void;
  search: string;
  setSearch: (search: string) => void;
  filteredSnippets: CodeSnippetType[];
  recentlyUsed: Array<CodeSnippetType & { language: string }>;
  handleSnippetClick: (snippet: CodeSnippetType & { language?: string }) => void;
}

const CodeEditorSidebar: React.FC<CodeEditorSidebarProps> = ({
  currentTheme,
  language,
  setLanguage,
  search,
  setSearch,
  filteredSnippets,
  recentlyUsed,
  handleSnippetClick
}) => {
  return (
    <div className="w-full md:w-64 flex flex-col border-r" 
      style={{ borderColor: `${currentTheme.colors.borderColor}40` }}
    >
      {/* Language selector */}
      <div className="p-3 border-b" style={{ borderColor: `${currentTheme.colors.borderColor}40` }}>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-1"
          style={{ color: currentTheme.colors.textMuted }}
        >
          Language
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full p-2 rounded-md text-sm"
          style={{ 
            backgroundColor: currentTheme.colors.bgPrimary,
            color: currentTheme.colors.textPrimary,
            border: `1px solid ${currentTheme.colors.borderColor}40`
          }}
        >
          {languageOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      
      {/* Search */}
      <div className="p-3 border-b" style={{ borderColor: `${currentTheme.colors.borderColor}40` }}>
        <input
          type="text"
          placeholder="Search snippets..."
          className="w-full px-3 py-2 rounded-md text-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ 
            backgroundColor: currentTheme.colors.bgPrimary,
            color: currentTheme.colors.textPrimary,
            border: `1px solid ${currentTheme.colors.borderColor}40`
          }}
        />
      </div>
      
      {/* Snippets list */}
      <div className="overflow-y-auto flex-1 p-3">
        <div className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: currentTheme.colors.textMuted }}
        >
          {search ? 'Search Results' : `${languageOptions.find(l => l.value === language)?.label} Snippets`}
        </div>
        
        {recentlyUsed.length > 0 && !search && (
          <div className="mb-4">
            <div className="text-xs font-medium mb-1"
              style={{ color: currentTheme.colors.textMuted }}
            >
              Recently Used
            </div>
            <div className="space-y-1">
              {recentlyUsed.map((snippet, index) => (
                <button
                  key={`recent-${index}`}
                  onClick={() => handleSnippetClick(snippet)}
                  className="block w-full text-left p-2 rounded-md text-sm truncate"
                  style={{ 
                    backgroundColor: `${currentTheme.colors.bgTertiary}20`,
                    color: currentTheme.colors.textPrimary,
                    border: `1px solid ${currentTheme.colors.borderColor}30`,
                  }}
                >
                  <div className="font-medium truncate">{snippet.name}</div>
                  <div className="text-xs truncate" style={{ color: currentTheme.colors.textMuted }}>
                    {languageOptions.find(l => l.value === snippet.language)?.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {filteredSnippets.length === 0 ? (
          <div className="text-center py-4" style={{ color: currentTheme.colors.textMuted }}>
            No snippets found
          </div>
        ) : (
          <div className="space-y-1">
            {filteredSnippets.map((snippet, index) => (
              <button
                key={`snippet-${index}`}
                onClick={() => handleSnippetClick(snippet)}
                className="block w-full text-left p-2 rounded-md text-sm"
                style={{ 
                  backgroundColor: `${currentTheme.colors.bgTertiary}20`,
                  color: currentTheme.colors.textPrimary,
                  border: `1px solid ${currentTheme.colors.borderColor}30`,
                }}
              >
                <div className="font-medium">{snippet.name}</div>
                <div className="text-xs truncate" style={{ color: currentTheme.colors.textMuted }}>
                  {snippet.description}
                </div>
                {'language' in snippet && snippet.language !== language && (
                  <div className="text-xs mt-1 px-1.5 py-0.5 rounded-sm inline-block" 
                    style={{ 
                      backgroundColor: `${currentTheme.colors.accentPrimary}20`, 
                      color: currentTheme.colors.accentPrimary 
                    }}
                  >
                    {languageOptions.find(l => l.value === snippet.language)?.label}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditorSidebar;