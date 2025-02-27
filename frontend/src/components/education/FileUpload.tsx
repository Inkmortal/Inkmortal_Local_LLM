import React, { useState, useRef, ChangeEvent } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedFileTypes?: string;
  maxSizeMB?: number;
  label?: string;
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  acceptedFileTypes = "image/*,application/pdf",
  maxSizeMB = 5,
  label = "Upload a file",
  className = ""
}) => {
  const { currentTheme } = useTheme();
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };
  
  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds ${maxSizeMB}MB limit`);
      return false;
    }
    
    // Check file type if specific types are required
    if (acceptedFileTypes !== '*') {
      const fileType = file.type;
      const acceptedTypes = acceptedFileTypes.split(',');
      
      const isValidType = acceptedTypes.some(type => {
        if (type.includes('*')) {
          // Handle wildcard types like "image/*"
          const typeCategory = type.split('/')[0];
          return fileType.startsWith(typeCategory);
        }
        return type === fileType;
      });
      
      if (!isValidType) {
        setError(`Invalid file type. Accepted types: ${acceptedFileTypes}`);
        return false;
      }
    }
    
    // Clear any previous errors
    setError(null);
    return true;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        // Reset input if validation fails
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        setSelectedFile(null);
      }
    }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    }
  };
  
  const handleClick = () => {
    inputRef.current?.click();
  };
  
  return (
    <div className={`w-full ${className}`}>
      <div
        className={`border-2 border-dashed rounded-lg p-4 ${
          dragActive ? 'border-opacity-100' : 'border-opacity-50'
        }`}
        style={{ 
          borderColor: dragActive 
            ? currentTheme.colors.accentPrimary 
            : currentTheme.colors.borderColor,
          backgroundColor: dragActive 
            ? `${currentTheme.colors.accentPrimary}10` 
            : currentTheme.colors.bgSecondary
        }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptedFileTypes}
          onChange={handleFileChange}
        />
        
        <div className="flex flex-col items-center justify-center py-4">
          <svg
            className="w-10 h-10 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            style={{ color: currentTheme.colors.accentSecondary }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          
          <p
            className="text-center mb-2"
            style={{ color: currentTheme.colors.textPrimary }}
          >
            {label}
          </p>
          
          <p
            className="text-xs text-center"
            style={{ color: currentTheme.colors.textMuted }}
          >
            Drag and drop, or click to select
          </p>
          
          <p
            className="text-xs text-center mt-1"
            style={{ color: currentTheme.colors.textMuted }}
          >
            {acceptedFileTypes.replace(/,/g, ', ')} (Max: {maxSizeMB}MB)
          </p>
        </div>
      </div>
      
      {selectedFile && (
        <div 
          className="mt-2 p-2 rounded flex justify-between items-center"
          style={{ backgroundColor: `${currentTheme.colors.accentPrimary}10` }}
        >
          <span style={{ color: currentTheme.colors.textPrimary }}>
            {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFile(null);
              if (inputRef.current) {
                inputRef.current.value = '';
              }
            }}
          >
            Remove
          </Button>
        </div>
      )}
      
      {error && (
        <p 
          className="text-sm mt-2"
          style={{ color: '#e74c3c' }}
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default FileUpload;