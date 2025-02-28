import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Artifact, ArtifactType, UploadedDocument } from './ArtifactsSidebar';
import CodeBlock from '../education/CodeBlock';

interface ArtifactCanvasProps {
  artifact?: Artifact;
  document?: UploadedDocument;
  isOpen: boolean;
  onClose: () => void;
}

const ArtifactCanvas: React.FC<ArtifactCanvasProps> = ({
  artifact,
  document,
  isOpen,
  onClose,
}) => {
  const { currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');

  const getFileIcon = (type: ArtifactType | string) => {
    switch (type) {
      case 'code':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case 'markdown':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        );
      case 'math':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3zm5 5.5h6m-3-3v6" />
          </svg>
        );
      case 'pdf':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'word':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'image':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const renderArtifactContent = () => {
    if (!artifact) return null;

    switch (artifact.type) {
      case 'code':
        if (activeTab === 'preview') {
          // Detect language from the first line if possible
          const language = artifact.content.startsWith('import numpy') 
            ? 'python' 
            : artifact.content.includes('function') 
              ? 'javascript' 
              : 'plaintext';
          
          return (
            <div className="overflow-auto p-4 h-full">
              <CodeBlock code={artifact.content} language={language} />
            </div>
          );
        } else {
          return (
            <div 
              className="overflow-auto p-4 h-full font-mono text-sm whitespace-pre"
              style={{ color: currentTheme.colors.textPrimary }}
            >
              {artifact.content}
            </div>
          );
        }
      
      case 'markdown':
        if (activeTab === 'preview') {
          return (
            <div 
              className="overflow-auto p-6 h-full prose prose-sm max-w-none"
              style={{ 
                color: currentTheme.colors.textPrimary,
                '--tw-prose-headings': currentTheme.colors.accentPrimary,
                '--tw-prose-links': currentTheme.colors.accentSecondary,
                '--tw-prose-code': currentTheme.colors.textPrimary,
                '--tw-prose-pre-bg': `${currentTheme.colors.bgTertiary}80`,
              } as React.CSSProperties}
              dangerouslySetInnerHTML={{ 
                __html: `
                  <h1>Fourier Transform</h1>
                  <p>The Fourier transform is a mathematical transform that decomposes a function into its constituent frequencies. The Fourier transform of a function <em>f(x)</em> is given by:</p>
                  <div class="math">
                    $$F(\\omega) = \\int_{-\\infty}^{\\infty} f(x) e^{-i\\omega x} dx$$
                  </div>
                  <p>And the inverse Fourier transform is:</p>
                  <div class="math">
                    $$f(x) = \\frac{1}{2\\pi} \\int_{-\\infty}^{\\infty} F(\\omega) e^{i\\omega x} d\\omega$$
                  </div>
                  <h2>Properties of Fourier Transform</h2>
                  <ol>
                    <li><strong>Linearity</strong>: $\\mathcal{F}\\{af(x) + bg(x)\\} = a\\mathcal{F}\\{f(x)\\} + b\\mathcal{F}\\{g(x)\\}$</li>
                    <li><strong>Scaling</strong>: $\\mathcal{F}\\{f(ax)\\} = \\frac{1}{|a|}F(\\frac{\\omega}{a})$</li>
                    <li><strong>Time Shifting</strong>: $\\mathcal{F}\\{f(x-a)\\} = e^{-i\\omega a}F(\\omega)$</li>
                    <li><strong>Frequency Shifting</strong>: $\\mathcal{F}\\{e^{ix_0 x}f(x)\\} = F(\\omega - x_0)$</li>
                    <li><strong>Convolution</strong>: $\\mathcal{F}\\{f * g\\} = F(\\omega) \\cdot G(\\omega)$</li>
                  </ol>
                  <h2>Applications</h2>
                  <ul>
                    <li>Signal processing</li>
                    <li>Image processing</li>
                    <li>Quantum mechanics</li>
                    <li>Probability theory</li>
                    <li>Data compression</li>
                  </ul>
                `
              }}
            />
          );
        } else {
          return (
            <div 
              className="overflow-auto p-4 h-full font-mono text-sm whitespace-pre"
              style={{ color: currentTheme.colors.textPrimary }}
            >
              {artifact.content}
            </div>
          );
        }
      
      case 'math':
        if (activeTab === 'preview') {
          return (
            <div 
              className="overflow-auto p-6 flex items-center justify-center h-full"
              style={{ color: currentTheme.colors.textPrimary }}
            >
              <div 
                className="bg-opacity-30 p-8 rounded-lg" 
                style={{ backgroundColor: currentTheme.colors.bgTertiary }}
              >
                <div 
                  className="text-xl math-display" 
                  dangerouslySetInnerHTML={{ 
                    __html: `
                      \\begin{align}
                      \\nabla \\cdot \\mathbf{E} &= \\frac{\\rho}{\\varepsilon_0} \\\\
                      \\nabla \\cdot \\mathbf{B} &= 0 \\\\
                      \\nabla \\times \\mathbf{E} &= -\\frac{\\partial\\mathbf{B}}{\\partial t} \\\\
                      \\nabla \\times \\mathbf{B} &= \\mu_0\\mathbf{J} + \\mu_0\\varepsilon_0\\frac{\\partial\\mathbf{E}}{\\partial t}
                      \\end{align}
                    ` 
                  }}
                />
                <div 
                  className="mt-4 text-center text-sm font-medium"
                  style={{ color: currentTheme.colors.accentPrimary }}
                >
                  Maxwell's Equations
                </div>
              </div>
            </div>
          );
        } else {
          return (
            <div 
              className="overflow-auto p-4 h-full font-mono text-sm whitespace-pre"
              style={{ color: currentTheme.colors.textPrimary }}
            >
              {artifact.content}
            </div>
          );
        }
    
      default:
        return (
          <div 
            className="flex items-center justify-center h-full"
            style={{ color: currentTheme.colors.textMuted }}
          >
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No preview available</p>
            </div>
          </div>
        );
    }
  };

  const renderDocumentContent = () => {
    if (!document) return null;

    switch (document.type) {
      case 'pdf':
        return (
          <div 
            className="flex items-center justify-center h-full"
            style={{ color: currentTheme.colors.textPrimary }}
          >
            <div className="text-center space-y-4">
              <div 
                className="w-24 h-32 mx-auto rounded-md flex items-center justify-center"
                style={{ 
                  backgroundColor: `${currentTheme.colors.bgTertiary}50`,
                  border: `1px solid ${currentTheme.colors.borderColor}`,
                  boxShadow: `0 4px 12px rgba(0, 0, 0, 0.1)`
                }}
              >
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="font-medium">{document.name}</p>
              <div 
                className="px-4 py-2 rounded-md inline-block cursor-pointer"
                style={{ 
                  backgroundColor: currentTheme.colors.accentPrimary,
                  color: 'white',
                  boxShadow: `0 2px 8px ${currentTheme.colors.accentPrimary}40`
                }}
              >
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDF
                </span>
              </div>
            </div>
          </div>
        );
      
      case 'word':
        return (
          <div 
            className="flex items-center justify-center h-full"
            style={{ color: currentTheme.colors.textPrimary }}
          >
            <div className="text-center space-y-4">
              <div 
                className="w-24 h-32 mx-auto rounded-md flex items-center justify-center"
                style={{ 
                  backgroundColor: `${currentTheme.colors.bgTertiary}50`,
                  border: `1px solid ${currentTheme.colors.borderColor}`,
                  boxShadow: `0 4px 12px rgba(0, 0, 0, 0.1)`
                }}
              >
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="font-medium">{document.name}</p>
              <div 
                className="px-4 py-2 rounded-md inline-block cursor-pointer"
                style={{ 
                  backgroundColor: currentTheme.colors.accentPrimary,
                  color: 'white',
                  boxShadow: `0 2px 8px ${currentTheme.colors.accentPrimary}40`
                }}
              >
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Document
                </span>
              </div>
            </div>
          </div>
        );
      
      case 'image':
        return (
          <div 
            className="flex items-center justify-center h-full p-8"
            style={{ color: currentTheme.colors.textPrimary }}
          >
            <div 
              className="max-w-full rounded-lg overflow-hidden shadow-lg"
              style={{ border: `1px solid ${currentTheme.colors.borderColor}` }}
            >
              {/* Placeholder image */}
              <div 
                className="w-full h-[500px] bg-gradient-to-br flex items-center justify-center"
                style={{ 
                  background: `linear-gradient(to bottom right, ${currentTheme.colors.bgSecondary}, ${currentTheme.colors.bgTertiary})`,
                }}
              >
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="font-medium">{document.name}</p>
                </div>
              </div>
            </div>
          </div>
        );
    
      default:
        return (
          <div 
            className="flex items-center justify-center h-full"
            style={{ color: currentTheme.colors.textMuted }}
          >
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No preview available</p>
            </div>
          </div>
        );
    }
  };

  // Generate title based on selected item
  const getTitle = () => {
    if (artifact) return artifact.title;
    if (document) return document.name;
    return 'Preview';
  };

  // Generate type based on selected item
  const getType = () => {
    if (artifact) return artifact.type;
    if (document) return document.type;
    return '';
  };

  // Format date for display
  const formatDate = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Determine if we should show tabs (only for content that has raw version)
  const shouldShowTabs = () => {
    if (artifact) {
      return ['code', 'markdown', 'math'].includes(artifact.type);
    }
    return false;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Canvas panel */}
      <div
        className={`fixed top-16 right-0 h-[calc(100vh-4rem)] w-[calc(100vw-18rem)] transition-transform duration-300 ease-in-out z-40 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: currentTheme.colors.bgPrimary,
          borderLeft: `1px solid ${currentTheme.colors.borderColor}40`,
          boxShadow: `-4px 0 20px rgba(0, 0, 0, 0.08)`,
        }}
      >
        <div className="h-full flex flex-col overflow-hidden">
          {/* Header */}
          <header
            className="py-3 px-6 flex items-center justify-between"
            style={{
              backgroundColor: currentTheme.colors.bgSecondary,
              borderBottom: `1px solid ${currentTheme.colors.borderColor}40`,
            }}
          >
            <div className="flex items-center">
              <div 
                className="w-10 h-10 rounded flex items-center justify-center mr-3"
                style={{
                  backgroundColor: `${currentTheme.colors.accentPrimary}20`,
                  color: currentTheme.colors.accentPrimary,
                }}
              >
                {getFileIcon(getType())}
              </div>
              <div>
                <h2
                  className="text-lg font-semibold"
                  style={{ color: currentTheme.colors.textPrimary }}
                >
                  {getTitle()}
                </h2>
                <div 
                  className="text-xs flex items-center"
                  style={{ color: currentTheme.colors.textMuted }}
                >
                  <span className="capitalize">{getType()}</span>
                  {(artifact?.dateCreated || document?.dateUploaded) && (
                    <>
                      <span className="mx-2">•</span>
                      <span>{formatDate(artifact?.dateCreated || document?.dateUploaded)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {shouldShowTabs() && (
                <div 
                  className="flex text-sm rounded-lg p-0.5"
                  style={{ 
                    backgroundColor: `${currentTheme.colors.bgTertiary}40`,
                  }}
                >
                  <button
                    className={`px-3 py-1 rounded-md transition-colors ${
                      activeTab === 'preview' ? 'font-medium' : ''
                    }`}
                    style={{ 
                      backgroundColor: activeTab === 'preview' 
                        ? `${currentTheme.colors.accentPrimary}20` 
                        : 'transparent',
                      color: activeTab === 'preview'
                        ? currentTheme.colors.accentPrimary
                        : currentTheme.colors.textMuted,
                    }}
                    onClick={() => setActiveTab('preview')}
                  >
                    Preview
                  </button>
                  <button
                    className={`px-3 py-1 rounded-md transition-colors ${
                      activeTab === 'raw' ? 'font-medium' : ''
                    }`}
                    style={{ 
                      backgroundColor: activeTab === 'raw' 
                        ? `${currentTheme.colors.accentPrimary}20` 
                        : 'transparent',
                      color: activeTab === 'raw'
                        ? currentTheme.colors.accentPrimary
                        : currentTheme.colors.textMuted,
                    }}
                    onClick={() => setActiveTab('raw')}
                  >
                    Raw
                  </button>
                </div>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-opacity-10"
                style={{
                  color: currentTheme.colors.textPrimary,
                  backgroundColor: `${currentTheme.colors.bgTertiary}40`,
                }}
              >
                <svg
                  className="w-5 h-5"
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
            </div>
          </header>

          {/* Content area */}
          <div className="flex-1 overflow-hidden">
            {artifact && renderArtifactContent()}
            {document && renderDocumentContent()}
            {!artifact && !document && (
              <div 
                className="flex items-center justify-center h-full"
                style={{ color: currentTheme.colors.textMuted }}
              >
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg">Select an artifact or document to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ArtifactCanvas;