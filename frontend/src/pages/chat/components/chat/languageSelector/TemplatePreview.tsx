import React from 'react';
import { useTheme } from '../../../../../context/ThemeContext';
import Button from '../../../../../components/ui/Button';
import { CodeTemplate } from './types';

interface TemplatePreviewProps {
  selectedTemplate: CodeTemplate | null;
  onInsert: () => void;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  selectedTemplate,
  onInsert
}) => {
  const { currentTheme } = useTheme();

  if (!selectedTemplate) {
    return (
      <div
        className="p-3 text-center text-sm opacity-70"
        style={{ color: currentTheme.colors.textMuted }}
      >
        Select a language to preview template
      </div>
    );
  }

  return (
    <div
      className="border-t"
      style={{ borderColor: `${currentTheme.colors.borderColor}30` }}
    >
      <div
        className="p-2 flex justify-between items-center"
        style={{
          backgroundColor: `${currentTheme.colors.bgTertiary}30`,
          borderBottom: `1px solid ${currentTheme.colors.borderColor}20`,
        }}
      >
        <span
          className="text-xs font-medium"
          style={{ color: currentTheme.colors.textSecondary }}
        >
          Preview: {selectedTemplate.language}
        </span>
        <Button size="xs" onClick={onInsert}>Insert</Button>
      </div>
      <div className="p-2 overflow-auto max-h-40 modern-scrollbar">
        <pre
          className="text-xs font-mono whitespace-pre rounded-md p-2 overflow-x-auto"
          style={{
            backgroundColor: `${currentTheme.colors.bgCode}`,
            color: currentTheme.colors.textCode,
          }}
        >
          {selectedTemplate.template}
        </pre>
      </div>
    </div>
  );
};

export default TemplatePreview;