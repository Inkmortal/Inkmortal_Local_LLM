import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import FileUpload from '../../../../components/education/FileUpload';

interface FileUploadAreaProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  setShowFileUpload: (show: boolean) => void;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  onFileSelect,
  selectedFile,
  setSelectedFile,
  setShowFileUpload,
}) => {
  const { currentTheme } = useTheme();

  const handleFileSelect = (file: File) => {
    onFileSelect(file);
    // Auto-close file upload area after file is selected
    setTimeout(() => {
      setShowFileUpload(false);
    }, 500);
  };

  const handleCancelClick = () => {
    setShowFileUpload(false);
    if (selectedFile) {
      setSelectedFile(null);
    }
  };

  return (
    <div className="p-4 animate-slideUp border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-4xl mx-auto relative">
        {/* Close button */}
        <button 
          className="absolute top-0 right-0 p-1 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={handleCancelClick}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <FileUpload
          onFileSelect={handleFileSelect}
          label="Upload an image or document to analyze"
          acceptedFileTypes=".pdf,.png,.jpg,.jpeg"
        />

        {selectedFile && (
          <div className="mt-2 py-1 px-3 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-200 rounded flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{selectedFile.name} selected</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadArea;