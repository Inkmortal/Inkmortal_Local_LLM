import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { 
  fetchModels, 
  setActiveModel, 
  updateSummarizationSettings,
  OllamaModel, 
  SummarizationSettings 
} from '../../services/admin';

// Format byte size to readable format
const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
};

// Format ISO date string to readable format
const formatDate = (dateString: string): string => {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (e) {
    return dateString;
  }
};

const ModelManagement: React.FC = () => {
  const { currentTheme } = useTheme();
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [activeModel, setActiveModelState] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [changeInProgress, setChangeInProgress] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Summarization settings state
  const [summarizationModel, setSummarizationModel] = useState<string>('');
  const [maxContextTokens, setMaxContextTokens] = useState<number>(120000);
  const [summarizationThreshold, setSummarizationThreshold] = useState<number>(70);
  const [summarizationSettingsChanged, setSummarizationSettingsChanged] = useState<boolean>(false);

  // Fetch models
  const fetchModelData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetchModels();
      
      if (response) {
        setModels(response.models);
        setActiveModelState(response.active_model);
        setSummarizationModel(response.summarization_model);
        setMaxContextTokens(response.max_context_tokens);
        setSummarizationThreshold(response.summarization_threshold);
      } else {
        setError('Failed to load models');
      }
    } catch (err) {
      console.error('Error fetching models:', err);
      setError('An error occurred while fetching models');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    fetchModelData();
  }, [fetchModelData]);

  // Handle model selection
  const handleSetActiveModel = async (modelName: string) => {
    if (modelName === activeModel) return;
    
    try {
      setChangeInProgress(true);
      setSuccessMessage(null);
      setError(null);
      
      const response = await setActiveModel(modelName);
      
      if (response && response.success) {
        setActiveModelState(modelName);
        setSuccessMessage(`Model changed to ${modelName} successfully`);
        
        // Refresh models list to update active status
        fetchModelData();
      } else {
        setError('Failed to change active model');
      }
    } catch (err) {
      console.error('Error setting active model:', err);
      setError('An error occurred while changing the model');
    } finally {
      setChangeInProgress(false);
    }
  };
  
  // Handle summarization settings update
  const handleSummarizationSettingsChange = () => {
    setSummarizationSettingsChanged(true);
  };
  
  // Save summarization settings
  const saveSummarizationSettings = async () => {
    try {
      setChangeInProgress(true);
      setSuccessMessage(null);
      setError(null);
      
      const settings: SummarizationSettings = {
        summarization_model: summarizationModel,
        max_context_tokens: maxContextTokens,
        summarization_threshold: summarizationThreshold
      };
      
      const response = await updateSummarizationSettings(settings);
      
      if (response && response.success) {
        setSuccessMessage(`Summarization settings updated successfully: ${response.message}`);
        setSummarizationSettingsChanged(false);
      } else {
        setError('Failed to update summarization settings');
      }
    } catch (err) {
      console.error('Error updating summarization settings:', err);
      setError('An error occurred while updating summarization settings');
    } finally {
      setChangeInProgress(false);
    }
  };

  return (
    <div className="mb-8 pb-8">
      <div className="mb-6 border-b" style={{ borderColor: `${currentTheme.colors.borderColor}40` }}>
        <h1 className="text-2xl font-bold mb-2" style={{ color: currentTheme.colors.accentPrimary }}>
          Model Management
        </h1>
        <p className="text-sm mb-4" style={{ color: currentTheme.colors.textMuted }}>
          View and manage available models for the LLM system
        </p>
      </div>

      {/* Success message */}
      {successMessage && (
        <div 
          className="mb-6 p-3 rounded-md"
          style={{
            backgroundColor: `${currentTheme.colors.success}20`,
            color: currentTheme.colors.success,
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div 
          className="mb-6 p-3 rounded-md"
          style={{
            backgroundColor: `${currentTheme.colors.error}20`,
            color: currentTheme.colors.error,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mb-4"
            style={{ borderColor: `${currentTheme.colors.accentPrimary}40`, borderTopColor: 'transparent' }}
          />
          <p style={{ color: currentTheme.colors.textSecondary }}>Loading models...</p>
        </div>
      ) : (
        <>
          {/* Active Model Section */}
          <Card title="Current Active Model" className="mb-6">
            <div 
              className="p-4 mb-4 rounded-md"
              style={{ 
                backgroundColor: `${currentTheme.colors.accentPrimary}15`,
                border: `1px solid ${currentTheme.colors.accentPrimary}30`
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg" style={{ color: currentTheme.colors.textPrimary }}>
                    {activeModel || 'No model selected'}
                  </h3>
                  <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
                    This model will be used for all chat interactions
                  </p>
                </div>
                <div 
                  className="px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: currentTheme.colors.success,
                    color: '#fff' 
                  }}
                >
                  Active
                </div>
              </div>
            </div>
            
            <p className="mb-4 text-sm" style={{ color: currentTheme.colors.textMuted }}>
              <strong>Note:</strong> Changing the model affects all users and may restart any ongoing conversations.
              Model changes are stored in memory and will revert to the default after server restart.
            </p>
          </Card>

          {/* Available Models Section */}
          <Card title="Available Models">
            {models.length === 0 ? (
              <div className="text-center py-6" style={{ color: currentTheme.colors.textSecondary }}>
                No models available from Ollama
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ color: currentTheme.colors.textSecondary }}>
                      <th className="text-left p-3 border-b" style={{ borderColor: currentTheme.colors.borderColor }}>Model Name</th>
                      <th className="text-left p-3 border-b" style={{ borderColor: currentTheme.colors.borderColor }}>Size</th>
                      <th className="text-left p-3 border-b" style={{ borderColor: currentTheme.colors.borderColor }}>Last Modified</th>
                      <th className="text-right p-3 border-b" style={{ borderColor: currentTheme.colors.borderColor }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((model) => (
                      <tr 
                        key={model.name}
                        className="hover:opacity-90 transition-opacity"
                        style={{ 
                          backgroundColor: model.is_active ? `${currentTheme.colors.accentPrimary}10` : 'transparent',
                        }}
                      >
                        <td className="p-3 border-b" style={{ borderColor: `${currentTheme.colors.borderColor}50` }}>
                          <div className="font-medium" style={{ color: currentTheme.colors.textPrimary }}>
                            {model.name}
                          </div>
                        </td>
                        <td className="p-3 border-b" style={{ borderColor: `${currentTheme.colors.borderColor}50`, color: currentTheme.colors.textSecondary }}>
                          {formatSize(model.size)}
                        </td>
                        <td className="p-3 border-b" style={{ borderColor: `${currentTheme.colors.borderColor}50`, color: currentTheme.colors.textSecondary }}>
                          {formatDate(model.modified_at)}
                        </td>
                        <td className="p-3 border-b text-right" style={{ borderColor: `${currentTheme.colors.borderColor}50` }}>
                          {model.is_active ? (
                            <span 
                              className="px-3 py-1.5 rounded-full text-sm font-medium inline-block"
                              style={{ 
                                backgroundColor: `${currentTheme.colors.success}20`,
                                color: currentTheme.colors.success 
                              }}
                            >
                              Active
                            </span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={changeInProgress}
                              className="text-sm rounded-md"
                              style={{
                                borderColor: currentTheme.colors.accentSecondary,
                                color: currentTheme.colors.accentSecondary
                              }}
                              onClick={() => handleSetActiveModel(model.name)}
                            >
                              {changeInProgress ? 'Setting...' : 'Set Active'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          
          {/* Refresh Button */}
          <div className="mt-4 text-right">
            <Button
              variant="ghost"
              size="sm"
              className="text-sm rounded-md"
              style={{
                color: currentTheme.colors.textSecondary
              }}
              onClick={fetchModelData}
              disabled={isLoading}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Models
            </Button>
          </div>
          {/* Summarization Settings Card */}
          <Card title="Conversation Summarization Settings" className="mt-6">
            <p className="mb-4 text-sm" style={{ color: currentTheme.colors.textMuted }}>
              Configure how conversations are summarized when they exceed context window limits.
              These settings control when and how the AI summarizes long conversations to maintain context.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Summarization Model */}
              <div>
                <label 
                  className="block mb-2 text-sm font-medium" 
                  style={{ color: currentTheme.colors.textSecondary }}
                >
                  Summarization Model
                </label>
                <select
                  className="w-full p-2 rounded-md border"
                  style={{ 
                    backgroundColor: currentTheme.colors.backgroundSecondary,
                    color: currentTheme.colors.textPrimary,
                    borderColor: currentTheme.colors.borderColor
                  }}
                  value={summarizationModel}
                  onChange={(e) => {
                    setSummarizationModel(e.target.value);
                    handleSummarizationSettingsChange();
                  }}
                  disabled={isLoading || changeInProgress}
                >
                  {models.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs" style={{ color: currentTheme.colors.textMuted }}>
                  The model used for creating conversation summaries
                </p>
              </div>
              
              {/* Max Context Tokens */}
              <div>
                <label 
                  className="block mb-2 text-sm font-medium" 
                  style={{ color: currentTheme.colors.textSecondary }}
                >
                  Max Context Tokens
                </label>
                <input
                  type="number"
                  className="w-full p-2 rounded-md border"
                  style={{ 
                    backgroundColor: currentTheme.colors.backgroundSecondary,
                    color: currentTheme.colors.textPrimary,
                    borderColor: currentTheme.colors.borderColor
                  }}
                  value={maxContextTokens}
                  onChange={(e) => {
                    setMaxContextTokens(parseInt(e.target.value));
                    handleSummarizationSettingsChange();
                  }}
                  min={1000}
                  max={200000}
                  step={1000}
                  disabled={isLoading || changeInProgress}
                />
                <p className="mt-1 text-xs" style={{ color: currentTheme.colors.textMuted }}>
                  Maximum tokens to send to LLM (128k recommended for most models)
                </p>
              </div>
              
              {/* Summarization Threshold */}
              <div>
                <label 
                  className="block mb-2 text-sm font-medium" 
                  style={{ color: currentTheme.colors.textSecondary }}
                >
                  Summarization Threshold (%)
                </label>
                <input
                  type="range"
                  className="w-full"
                  min={10}
                  max={95}
                  step={5}
                  value={summarizationThreshold}
                  onChange={(e) => {
                    setSummarizationThreshold(parseInt(e.target.value));
                    handleSummarizationSettingsChange();
                  }}
                  disabled={isLoading || changeInProgress}
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: currentTheme.colors.textMuted }}>
                  <span>10%</span>
                  <span>{summarizationThreshold}%</span>
                  <span>95%</span>
                </div>
                <p className="mt-1 text-xs" style={{ color: currentTheme.colors.textMuted }}>
                  Percentage of max context that triggers summarization
                </p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                className="rounded-md"
                onClick={saveSummarizationSettings}
                disabled={isLoading || changeInProgress || !summarizationSettingsChanged}
                style={{
                  backgroundColor: summarizationSettingsChanged ? currentTheme.colors.accentPrimary : `${currentTheme.colors.accentPrimary}50`,
                  color: summarizationSettingsChanged ? '#fff' : `${currentTheme.colors.textPrimary}50`
                }}
              >
                {changeInProgress ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default ModelManagement;