import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import FileUpload from '../../../../components/education/FileUpload';

interface FileUploadAreaProps {
  showFileUpload: boolean;
  onFileSelect: (file: File) => void;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  showFileUpload,
  onFileSelect,
}) => {
  const { currentTheme } = useTheme();

  if (!showFileUpload) return null;

  return (
    <div 
      className="px-5 py-4 animate-slideUp"
      style={{ 
        background: `linear-gradient(to top, ${currentTheme.colors.bgSecondary}90, ${currentTheme.colors.bgTertiary}90)`,
        backdropFilter: 'blur(10px)',
      }}
    >
      <FileUpload
        onFileSelect={onFileSelect}
        label="Upload an image or PDF to analyze"
      />
    </div>
  );
};

export default FileUploadArea;