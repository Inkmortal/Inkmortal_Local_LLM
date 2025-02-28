import React from 'react';
import MathRenderer from '../../../education/MathRenderer';
import { MathTemplateType } from '../types/SnippetTypes';

interface MathTemplatesProps {
  currentTheme: any;
  search: string;
  activeCategory: string | null;
  filteredTemplates: MathTemplateType[];
  recentlyUsed: MathTemplateType[];
  handleTemplateClick: (template: MathTemplateType) => void;
}

const MathTemplates: React.FC<MathTemplatesProps> = ({
  currentTheme,
  search,
  activeCategory,
  filteredTemplates,
  recentlyUsed,
  handleTemplateClick
}) => {
  return (
    <div className="p-3 border-b overflow-y-auto max-h-48"
      style={{ borderColor: `${currentTheme.colors.borderColor}40` }}
    >
      {/* Show category name or search results */}
      <div className="text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color: currentTheme.colors.textMuted }}
      >
        {search ? 'Search Results' : activeCategory || 'All Templates'}
      </div>
      
      {recentlyUsed.length > 0 && !search && !activeCategory && (
        <div className="mb-3">
          <div className="text-xs font-medium mb-1"
            style={{ color: currentTheme.colors.textMuted }}
          >
            Recently Used
          </div>
          <div className="flex flex-wrap gap-2">
            {recentlyUsed.map((template, index) => (
              <button
                key={`recent-${index}`}
                onClick={() => handleTemplateClick(template)}
                className="px-3 py-2 rounded-md text-sm flex items-center"
                style={{ 
                  backgroundColor: `${currentTheme.colors.bgTertiary}40`,
                  color: currentTheme.colors.textPrimary,
                  border: `1px solid ${currentTheme.colors.borderColor}40`
                }}
              >
                <MathRenderer latex={template.latex} display={false} className="mx-1" />
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Templates grid */}
      <div className="grid grid-cols-2 gap-2">
        {filteredTemplates.length === 0 ? (
          <div className="col-span-2 text-center py-4"
            style={{ color: currentTheme.colors.textMuted }}
          >
            No expressions found
          </div>
        ) : (
          filteredTemplates.map((template, index) => (
            <button
              key={`template-${index}`}
              onClick={() => handleTemplateClick(template)}
              className="flex flex-col p-2 rounded-md hover:bg-opacity-10 text-left"
              style={{ 
                backgroundColor: `${currentTheme.colors.bgTertiary}20`,
                border: `1px solid ${currentTheme.colors.borderColor}30`,
                color: currentTheme.colors.textPrimary
              }}
            >
              <div className="flex-1 flex items-center justify-center py-2">
                <MathRenderer latex={template.latex} display={true} />
              </div>
              <div className="mt-1 text-xs font-medium"
                style={{ color: currentTheme.colors.textSecondary }}
              >
                {template.name}
              </div>
              <div className="text-xs truncate"
                style={{ color: currentTheme.colors.textMuted }}
              >
                {template.description}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default MathTemplates;