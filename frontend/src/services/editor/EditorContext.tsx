import React, { createContext, useRef, useContext, ReactNode, useState } from 'react';
import { Editor } from '@tiptap/react';

// Define the context shape
interface EditorContextType {
  // Editor instance (optional)
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
  
  // Functions for content manipulation
  insertCode: (code: string, language?: string) => void;
  insertMath: (math: string, isInline?: boolean) => void;
  togglePreview: () => void;
  
  // State information
  isPreviewMode: boolean;
  
  // Refs (internal use)
  codeInsertRef: React.MutableRefObject<((code: string, language?: string) => void) | undefined>;
  mathInsertRef: React.MutableRefObject<((math: string) => void) | undefined>;
}

// Create the context with a default value
const EditorContext = createContext<EditorContextType | null>(null);

// Provider component
export const EditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Editor instance state
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // Create refs at the top level
  const codeInsertRef = useRef<((code: string, language?: string) => void) | undefined>(undefined);
  const mathInsertRef = useRef<((math: string) => void) | undefined>(undefined);
  
  // Helper functions
  const insertCode = (code: string, language = 'javascript') => {
    if (codeInsertRef.current) {
      codeInsertRef.current(code, language);
    }
  };
  
  const insertMath = (math: string, isInline = true) => {
    if (mathInsertRef.current) {
      mathInsertRef.current(math);
    }
  };
  
  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };
  
  // Create context value
  const value: EditorContextType = {
    editor: editorInstance,
    setEditor: setEditorInstance,
    insertCode,
    insertMath,
    togglePreview,
    isPreviewMode,
    codeInsertRef,
    mathInsertRef,
  };
  
  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};

// Custom hook for using the editor context
export const useEditor = () => {
  const context = useContext(EditorContext);
  
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  
  return context;
};

// Export context for direct use if needed
export default EditorContext;