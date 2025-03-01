import React from 'react';
import { useTheme } from '../../../../../context/ThemeContext';
import { Language } from './types';

interface LanguageListProps {
  languages: Language[];
  selectedIndex: number;
  onSelectLanguage: (index: number) => void;
}

const LanguageList: React.FC<LanguageListProps> = ({
  languages,
  selectedIndex,
  onSelectLanguage
}) => {
  const { currentTheme } = useTheme();

  return (
    <div className="max-h-60 overflow-y-auto pr-1 modern-scrollbar">
      {languages.map((language, index) => (
        <div
          key={language.value}
          className={`p-2 rounded-md cursor-pointer transition-all flex items-center ${
            selectedIndex === index
              ? 'bg-opacity-20'
              : 'hover:bg-opacity-10'
          }`}
          style={{
            backgroundColor:
              selectedIndex === index
                ? `${currentTheme.colors.accentPrimary}30`
                : 'transparent',
          }}
          onClick={() => onSelectLanguage(index)}
        >
          {language.icon && (
            <span
              className="mr-2 w-5 h-5 flex-shrink-0 flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: language.icon }}
            />
          )}
          <span
            className={`text-sm ${
              selectedIndex === index ? 'font-medium' : 'font-normal'
            }`}
            style={{
              color:
                selectedIndex === index
                  ? currentTheme.colors.textPrimary
                  : currentTheme.colors.textSecondary,
            }}
          >
            {language.name}
          </span>
        </div>
      ))}
    </div>
  );
};

export default LanguageList;