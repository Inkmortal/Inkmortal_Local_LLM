import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export type ArtifactType = 'code' | 'markdown' | 'image' | 'pdf' | 'word' | 'math';

export interface Artifact {
  id: string;
  title: string;
  description: string;
  type: ArtifactType;
  dateCreated: Date;
  content: string;
  thumbnail?: string;
}

export interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  dateUploaded: Date;
  thumbnail?: string;
}

interface ArtifactsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onArtifactSelect: (artifact: Artifact) => void;
  onDocumentSelect: (document: UploadedDocument) => void;
}

// Sample artifacts data
const sampleArtifacts: Artifact[] = [
  {
    id: '1',
    title: 'Neural Network Implementation',
    description: 'Python code for a simple neural network',
    type: 'code',
    dateCreated: new Date(2023, 6, 15),
    content: `import numpy as np

class NeuralNetwork:
    def __init__(self, layers):
        self.layers = layers
        self.weights = []
        self.biases = []
        
        # Initialize weights and biases
        for i in range(1, len(layers)):
            self.weights.append(np.random.randn(layers[i-1], layers[i]) * 0.1)
            self.biases.append(np.random.randn(1, layers[i]) * 0.1)
    
    def sigmoid(self, x):
        return 1 / (1 + np.exp(-x))
    
    def sigmoid_derivative(self, x):
        return x * (1 - x)
    
    def forward(self, X):
        self.activations = [X]
        self.z_values = []
        
        # Forward propagation
        activation = X
        for i in range(len(self.weights)):
            z = np.dot(activation, self.weights[i]) + self.biases[i]
            self.z_values.append(z)
            activation = self.sigmoid(z)
            self.activations.append(activation)
        
        return activation
    
    def backward(self, X, y, learning_rate):
        m = X.shape[0]
        
        # Output layer error
        error = self.activations[-1] - y
        delta = error * self.sigmoid_derivative(self.activations[-1])
        
        # Backpropagate the error
        for i in range(len(self.weights)-1, -1, -1):
            self.weights[i] -= learning_rate * np.dot(self.activations[i].T, delta) / m
            self.biases[i] -= learning_rate * np.sum(delta, axis=0, keepdims=True) / m
            
            if i > 0:
                delta = np.dot(delta, self.weights[i].T) * self.sigmoid_derivative(self.activations[i])
    
    def train(self, X, y, epochs, learning_rate):
        for epoch in range(epochs):
            # Forward pass
            output = self.forward(X)
            
            # Compute loss
            loss = np.mean(np.square(output - y))
            
            # Backward pass
            self.backward(X, y, learning_rate)
            
            if epoch % 1000 == 0:
                print(f"Epoch {epoch}, Loss: {loss}")
        
        return loss

# Example usage
if __name__ == "__main__":
    # XOR problem
    X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
    y = np.array([[0], [1], [1], [0]])
    
    nn = NeuralNetwork([2, 4, 1])
    final_loss = nn.train(X, y, 10000, 0.1)
    
    # Test the network
    predictions = nn.forward(X)
    print("Predictions:")
    print(predictions)`,
  },
  {
    id: '2',
    title: 'Fourier Transform Notes',
    description: 'Mathematical notes on Fourier transforms',
    type: 'markdown',
    dateCreated: new Date(2023, 7, 20),
    content: `# Fourier Transform

The Fourier transform is a mathematical transform that decomposes a function into its constituent frequencies. The Fourier transform of a function $f(x)$ is given by:

$$F(\\omega) = \\int_{-\\infty}^{\\infty} f(x) e^{-i\\omega x} dx$$

And the inverse Fourier transform is:

$$f(x) = \\frac{1}{2\\pi} \\int_{-\\infty}^{\\infty} F(\\omega) e^{i\\omega x} d\\omega$$

## Properties of Fourier Transform

1. **Linearity**: $\\mathcal{F}\\{af(x) + bg(x)\\} = a\\mathcal{F}\\{f(x)\\} + b\\mathcal{F}\\{g(x)\\}$

2. **Scaling**: $\\mathcal{F}\\{f(ax)\\} = \\frac{1}{|a|}F(\\frac{\\omega}{a})$

3. **Time Shifting**: $\\mathcal{F}\\{f(x-a)\\} = e^{-i\\omega a}F(\\omega)$

4. **Frequency Shifting**: $\\mathcal{F}\\{e^{ix_0 x}f(x)\\} = F(\\omega - x_0)$

5. **Convolution**: $\\mathcal{F}\\{f * g\\} = F(\\omega) \\cdot G(\\omega)$

## Applications

- Signal processing
- Image processing
- Quantum mechanics
- Probability theory
- Data compression

## Code Example

\`\`\`python
import numpy as np
import matplotlib.pyplot as plt

def compute_fft(signal, fs):
    """Compute the FFT of a signal."""
    N = len(signal)
    fft_result = np.fft.fft(signal)
    freqs = np.fft.fftfreq(N, 1/fs)
    
    # Get the positive frequencies
    pos_mask = freqs >= 0
    freqs = freqs[pos_mask]
    fft_result = fft_result[pos_mask]
    
    return freqs, np.abs(fft_result)

# Generate a test signal with multiple frequency components
fs = 1000  # Sampling frequency (Hz)
t = np.arange(0, 1, 1/fs)  # Time vector
f1, f2, f3 = 50, 120, 200  # Frequency components (Hz)
signal = np.sin(2*np.pi*f1*t) + 0.5*np.sin(2*np.pi*f2*t) + 0.25*np.sin(2*np.pi*f3*t)

# Compute FFT
freqs, magnitudes = compute_fft(signal, fs)

# Plot the results
plt.figure(figsize=(12, 6))
plt.subplot(2, 1, 1)
plt.plot(t[:100], signal[:100])
plt.title('Time Domain Signal (First 100 samples)')
plt.xlabel('Time (s)')
plt.ylabel('Amplitude')

plt.subplot(2, 1, 2)
plt.plot(freqs, magnitudes)
plt.title('Frequency Domain')
plt.xlabel('Frequency (Hz)')
plt.ylabel('Magnitude')
plt.xlim(0, 250)

plt.tight_layout()
plt.show()
\`\`\``,
  },
  {
    id: '3',
    title: 'Maxwell Equations',
    description: 'Mathematical formulation of electromagnetic fields',
    type: 'math',
    dateCreated: new Date(2023, 8, 5),
    content: `\\begin{align}
\\nabla \\cdot \\mathbf{E} &= \\frac{\\rho}{\\varepsilon_0} \\\\
\\nabla \\cdot \\mathbf{B} &= 0 \\\\
\\nabla \\times \\mathbf{E} &= -\\frac{\\partial\\mathbf{B}}{\\partial t} \\\\
\\nabla \\times \\mathbf{B} &= \\mu_0\\mathbf{J} + \\mu_0\\varepsilon_0\\frac{\\partial\\mathbf{E}}{\\partial t}
\\end{align}`,
  },
];

// Sample uploaded documents
const sampleDocuments: UploadedDocument[] = [
  {
    id: '1',
    name: 'research_paper.pdf',
    type: 'pdf',
    size: 2500000,
    dateUploaded: new Date(2023, 8, 10),
  },
  {
    id: '2',
    name: 'dataset_analysis.docx',
    type: 'word',
    size: 1800000,
    dateUploaded: new Date(2023, 8, 12),
  },
  {
    id: '3',
    name: 'experiment_results.png',
    type: 'image',
    size: 950000,
    dateUploaded: new Date(2023, 8, 15),
  },
];

const ArtifactsSidebar: React.FC<ArtifactsSidebarProps> = ({
  isOpen,
  onClose,
  onArtifactSelect,
  onDocumentSelect,
}) => {
  const { currentTheme } = useTheme();

  const getTypeIcon = (type: ArtifactType | string) => {
    switch (type) {
      case 'code':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case 'markdown':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        );
      case 'math':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3zm5 5.5h6m-3-3v6" />
          </svg>
        );
      case 'pdf':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'word':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'image':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-20 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-16 right-0 h-[calc(100vh-4rem)] w-80 transition-transform duration-300 ease-in-out z-30 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: `linear-gradient(to bottom, ${currentTheme.colors.bgSecondary}, ${currentTheme.colors.bgPrimary}F0)`,
          borderLeft: `1px solid ${currentTheme.colors.borderColor}40`,
          boxShadow: `-4px 0 20px rgba(0, 0, 0, 0.05)`,
        }}
      >
        <div className="h-full flex flex-col overflow-hidden">
          <header
            className="py-4 px-6 flex items-center justify-between"
            style={{
              borderBottom: `1px solid ${currentTheme.colors.borderColor}40`,
            }}
          >
            <h2
              className="text-lg font-semibold"
              style={{ color: currentTheme.colors.textPrimary }}
            >
              Artifacts & Files
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-opacity-10"
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
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Generated Artifacts Section */}
            <section>
              <h3
                className="text-md font-medium mb-3 flex items-center"
                style={{ color: currentTheme.colors.accentSecondary }}
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                Generated Artifacts
              </h3>

              <div className="space-y-2">
                {sampleArtifacts.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="p-3 rounded-lg cursor-pointer transition-all hover:scale-102"
                    style={{
                      backgroundColor: `${currentTheme.colors.bgTertiary}30`,
                      boxShadow: `0 2px 8px rgba(0, 0, 0, 0.05)`,
                      borderLeft: `3px solid ${currentTheme.colors.accentPrimary}`,
                    }}
                    onClick={() => onArtifactSelect(artifact)}
                  >
                    <div className="flex items-center mb-2">
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center mr-3"
                        style={{
                          backgroundColor: `${currentTheme.colors.accentPrimary}20`,
                          color: currentTheme.colors.accentPrimary,
                        }}
                      >
                        {getTypeIcon(artifact.type)}
                      </div>
                      <div>
                        <h4
                          className="font-medium text-sm"
                          style={{ color: currentTheme.colors.textPrimary }}
                        >
                          {artifact.title}
                        </h4>
                        <p
                          className="text-xs"
                          style={{ color: currentTheme.colors.textMuted }}
                        >
                          {formatDate(artifact.dateCreated)}
                        </p>
                      </div>
                    </div>
                    <p
                      className="text-xs truncate"
                      style={{ color: currentTheme.colors.textSecondary }}
                    >
                      {artifact.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Uploaded Documents Section */}
            <section>
              <h3
                className="text-md font-medium mb-3 flex items-center"
                style={{ color: currentTheme.colors.accentSecondary }}
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
                Uploaded Documents
              </h3>

              <div className="space-y-2">
                {sampleDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="p-3 rounded-lg cursor-pointer transition-all hover:scale-102"
                    style={{
                      backgroundColor: `${currentTheme.colors.bgTertiary}30`,
                      boxShadow: `0 2px 8px rgba(0, 0, 0, 0.05)`,
                      borderLeft: `3px solid ${currentTheme.colors.accentSecondary}`,
                    }}
                    onClick={() => onDocumentSelect(document)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center mr-3"
                          style={{
                            backgroundColor: `${currentTheme.colors.accentSecondary}20`,
                            color: currentTheme.colors.accentSecondary,
                          }}
                        >
                          {getTypeIcon(document.type)}
                        </div>
                        <div>
                          <h4
                            className="font-medium text-sm truncate max-w-[150px]"
                            style={{ color: currentTheme.colors.textPrimary }}
                          >
                            {document.name}
                          </h4>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: currentTheme.colors.textMuted }}>
                      <span>{formatFileSize(document.size)}</span>
                      <span>{formatDate(document.dateUploaded)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </aside>
    </>
  );
};

export default ArtifactsSidebar;