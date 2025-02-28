import React from 'react';
import MathRenderer from '../../../education/MathRenderer';
import { MathTemplateType } from '../types/SnippetTypes';

interface MathSidebarProps {
  currentTheme: any;
  search: string;
  setSearch: (search: string) => void;
  activeCategory: string | null;
  setActiveCategory: (category: string | null) => void;
  filteredTemplates: MathTemplateType[];
  recentlyUsed: MathTemplateType[];
  handleTemplateClick: (template: MathTemplateType) => void;
  categories: string[];
}

const MathSidebar: React.FC<MathSidebarProps> = ({
  currentTheme,
  search,
  setSearch,
  activeCategory,
  setActiveCategory,
  filteredTemplates,
  recentlyUsed,
  handleTemplateClick,
  categories
}) => {
  return (
    <div className="w-full md:w-64 flex flex-col border-r" 
      style={{ borderColor: `${currentTheme.colors.borderColor}40` }}
    >
      {/* Search */}
      <div className="p-2 border-b" style={{ borderColor: `${currentTheme.colors.borderColor}40` }}>
        <input
          type="text"
          placeholder="Search expressions..."
          className="w-full px-3 py-2 rounded-md"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ 
            backgroundColor: currentTheme.colors.bgPrimary,
            color: currentTheme.colors.textPrimary,
            border: `1px solid ${currentTheme.colors.borderColor}40`
          }}
        />
      </div>
      
      {/* Categories */}
      <div className="overflow-y-auto flex-1">
        <div className="p-2">
          <div className="text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color: currentTheme.colors.textMuted }}
          >
            Categories
          </div>
          
          {categories.map(category => (
            <button
              key={category}
              onClick={() => {
                setActiveCategory(category);
                setSearch('');
              }}
              className={`block w-full text-left px-3 py-2 rounded-md mb-1 text-sm ${
                activeCategory === category ? 'font-medium' : ''
              }`}
              style={{ 
                backgroundColor: activeCategory === category 
                  ? `${currentTheme.colors.accentPrimary}15` 
                  : 'transparent',
                color: activeCategory === category
                  ? currentTheme.colors.accentPrimary
                  : currentTheme.colors.textPrimary
              }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MathSidebar;