import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/ui/Card';
import { fetchSystemStats, fetchModels, setActiveModel, OllamaModel } from '../../services/admin';

// Import components
import RefreshControls from '../../components/admin/RefreshControls';
import AutoRefreshToggle from '../../components/admin/AutoRefreshToggle';
import HealthCard from '../../components/admin/HealthCard';
import ResourceCard from '../../components/admin/ResourceCard';
import StatusCard from '../../components/admin/StatusCard';

// Import services
import { 
  SystemStatsData,
  determineSystemHealth, 
  convertToDetailedStats,
  formatGB,
  formatUptime,
  createDefaultStats
} from './SystemStatsService';

const SystemStats: React.FC = () => {
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState<SystemStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Model management states
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelChangeInProgress, setModelChangeInProgress] = useState(false);
  const [modelSuccess, setModelSuccess] = useState<string | null>(null);
  
  // System health statuses
  const systemHealthStatuses = {
    good: { label: 'Good', color: currentTheme.colors.success },
    warning: { label: 'Warning', color: currentTheme.colors.warning },
    critical: { label: 'Critical', color: currentTheme.colors.error },
  };
  
  // Fetch system stats - implemented as useCallback to avoid dependency issues in useEffect
  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      // Fetch basic system stats using the updated function
      const basicStats = await fetchSystemStats();
      
      if (basicStats) {
        // Convert to detailed format
        const detailedStats = convertToDetailedStats(basicStats);
        setStats(detailedStats);
        setError(null);
        setLastUpdated(new Date());
      } else {
        setError('Failed to load system statistics');
      }
    } catch (err) {
      console.error('Error fetching system stats:', err);
      setError('An error occurred while fetching system statistics');
      
      // Check if authentication error 
      if (err instanceof Error && err.message.includes('401')) {
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Fetch models - implemented as useCallback to avoid dependency issues in useEffect
  const fetchModelsList = useCallback(async () => {
    try {
      setModelsLoading(true);
      setModelSuccess(null);
      const response = await fetchModels();
      
      if (response) {
        setModels(response.models);
      }
    } catch (err) {
      console.error("Error fetching models:", err);
    } finally {
      setModelsLoading(false);
    }
  }, []);
  
  // Handle model selection change
  const handleModelChange = async (modelName: string) => {
    if (!modelName || modelName === stats?.ollama.model) return;
    
    try {
      setModelChangeInProgress(true);
      setModelSuccess(null);
      setError(null);
      
      const response = await setActiveModel(modelName);
      
      if (response && response.success) {
        setModelSuccess(`Model changed to ${modelName} successfully`);
        fetchStats(); // Refresh stats to show the new model
      } else {
        setError("Failed to change active model");
      }
    } catch (err) {
      console.error("Error setting active model:", err);
      setError("An error occurred while changing the model");
    } finally {
      setModelChangeInProgress(false);
    }
  };
  
  // Initial data load and auto-refresh
  useEffect(() => {
    fetchStats();
    fetchModelsList(); // Add this to fetch models on initial load
    
    // Set up auto-refresh
    let intervalId: number | null = null;
    
    if (autoRefresh) {
      intervalId = window.setInterval(() => {
        fetchStats();
      }, refreshInterval);
    }
    
    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [refreshInterval, autoRefresh, fetchStats, fetchModelsList]);
  
  // Handle refresh now
  const handleRefresh = () => {
    fetchStats();
    fetchModelsList(); // Add this to refresh models when manually refreshing
  };
  
  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };
  
  // Handle refresh interval change
  const handleRefreshIntervalChange = (interval: number) => {
    setRefreshInterval(interval);
  };
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, navigate]);

  // Create health overview items
  const createHealthOverviewItems = (stats: SystemStatsData) => {
    const health = determineSystemHealth(stats);
    return [
      {
        label: 'Overall Health',
        status: health.overall,
        value: systemHealthStatuses[health.overall].label
      },
      {
        label: 'CPU Usage',
        status: health.cpu,
        value: `${stats.cpu.usage.toFixed(1)}%`
      },
      {
        label: 'Memory Usage',
        status: health.memory,
        value: `${stats.memory.percentage.toFixed(1)}%`
      },
      {
        label: 'Storage Usage',
        status: health.storage,
        value: `${stats.storage.percentage.toFixed(1)}%`
      }
    ];
  };
  
  return (
    <div className="mb-8 pb-8">
      {/* Header with refresh controls */}
      <RefreshControls
        title="System Statistics"
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        accentColor={currentTheme.colors.accentPrimary}
        textMutedColor={currentTheme.colors.textMuted}
        bgSecondaryColor={currentTheme.colors.bgSecondary}
        textSecondaryColor={currentTheme.colors.textSecondary}
        borderColor={currentTheme.colors.borderColor}
      />
      
      {/* Auto-refresh settings */}
      <AutoRefreshToggle
        autoRefresh={autoRefresh}
        refreshInterval={refreshInterval}
        onToggleAutoRefresh={toggleAutoRefresh}
        onChangeInterval={handleRefreshIntervalChange}
        textSecondaryColor={currentTheme.colors.textSecondary}
        bgTertiaryColor={currentTheme.colors.bgTertiary}
        textPrimaryColor={currentTheme.colors.textPrimary}
        borderColor={currentTheme.colors.borderColor}
      />
      
      {/* Success message for model change */}
      {modelSuccess && (
        <div 
          className="mb-6 p-3 rounded-md"
          style={{
            backgroundColor: `${currentTheme.colors.success}20`,
            color: currentTheme.colors.success,
          }}
        >
          {modelSuccess}
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
      {isLoading && !stats ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mb-4"
            style={{ borderColor: `${currentTheme.colors.accentPrimary}40`, borderTopColor: 'transparent' }}
          />
          <p style={{ color: currentTheme.colors.textSecondary }}>Loading system statistics...</p>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* System Health Overview */}
          <HealthCard
            items={createHealthOverviewItems(stats)}
            systemHealthStatuses={systemHealthStatuses}
            textSecondaryColor={currentTheme.colors.textSecondary}
          />
          
          {/* Resource Utilization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CPU Resource Card */}
            <ResourceCard
              title="CPU Utilization"
              value={stats.cpu.usage}
              label="Current CPU Usage"
              accentColor={currentTheme.colors.accentPrimary}
              textSecondaryColor={currentTheme.colors.textSecondary}
              borderColor={currentTheme.colors.borderColor}
              additionalInfo={stats.cpu.cores > 0 ? `${stats.cpu.cores} Cores` : 'CPU Utilization'}
            />
            
            {/* Memory Resource Card */}
            <ResourceCard
              title="Memory Utilization"
              value={stats.memory.percentage}
              label="Memory Usage"
              accentColor={currentTheme.colors.accentSecondary}
              textSecondaryColor={currentTheme.colors.textSecondary}
              borderColor={currentTheme.colors.borderColor}
              additionalInfo={stats.memory.total > 0 ? `${formatGB(stats.memory.used)} / ${formatGB(stats.memory.total)}` : 'Memory Usage'}
            />
          </div>
          
          {/* Storage and System Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Storage Resource Card */}
            <ResourceCard
              title="Storage Utilization"
              value={stats.storage.percentage}
              label="Storage Used"
              accentColor={currentTheme.colors.accentTertiary}
              textSecondaryColor={currentTheme.colors.textSecondary}
              borderColor={currentTheme.colors.borderColor}
              additionalInfo={stats.storage.total > 0 ? `${formatGB(stats.storage.used)} / ${formatGB(stats.storage.total)}` : 'Storage Usage'}
            />
            
            {/* System Status Panel */}
            <Card title="System Status" hoverEffect>
              <div className="grid grid-cols-2 gap-4">
                {/* Uptime */}
                <StatusCard
                  title="System Uptime"
                  value={formatUptime(stats.uptime)}
                  accentColor={currentTheme.colors.success}
                  backgroundColor={`${currentTheme.colors.bgTertiary}30`}
                  textSecondaryColor={currentTheme.colors.textSecondary}
                  textPrimaryColor={currentTheme.colors.textPrimary}
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                      style={{ color: currentTheme.colors.success }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                
                {/* Ollama Status */}
                <StatusCard
                  title="Ollama Status"
                  value={stats.ollama.status}
                  accentColor={stats.ollama.status === 'Running' ? currentTheme.colors.success : currentTheme.colors.error}
                  backgroundColor={`${stats.ollama.status === 'Running' ? currentTheme.colors.success : currentTheme.colors.error}10`}
                  borderStyle="left"
                  textSecondaryColor={currentTheme.colors.textSecondary}
                  textPrimaryColor={currentTheme.colors.textPrimary}
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                      style={{ color: stats.ollama.status === 'Running' ? currentTheme.colors.success : currentTheme.colors.error }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  }
                />
                
                {/* Model with dropdown */}
                <div className="col-span-2 p-4 rounded-lg border" style={{ borderColor: currentTheme.colors.borderColor }}>
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium" style={{ color: currentTheme.colors.textSecondary }}>
                      Active Model
                    </label>
                    <div className="flex items-center space-x-2">
                      <select
                        value={stats.ollama.model}
                        onChange={(e) => handleModelChange(e.target.value)}
                        disabled={modelChangeInProgress || modelsLoading}
                        className="w-full p-2 rounded-md border focus:outline-none"
                        style={{
                          backgroundColor: currentTheme.colors.bgSecondary,
                          color: currentTheme.colors.textPrimary,
                          borderColor: currentTheme.colors.borderColor
                        }}
                      >
                        <option value={stats.ollama.model}>
                          {stats.ollama.model} (Current)
                        </option>
                        {models
                          .filter(model => model.name !== stats.ollama.model)
                          .map(model => (
                            <option key={model.name} value={model.name}>
                              {model.name}
                            </option>
                          ))
                        }
                      </select>
                      {modelChangeInProgress && (
                        <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full"
                          style={{ borderColor: `${currentTheme.colors.accentPrimary}70`, borderTopColor: 'transparent' }}
                        />
                      )}
                    </div>
                    <p className="text-xs" style={{ color: currentTheme.colors.textMuted }}>
                      {modelsLoading 
                        ? "Loading available models..." 
                        : models.length > 0 
                          ? "Select a different model to change the active LLM" 
                          : "No other models available"
                      }
                    </p>
                  </div>
                </div>
                
                {/* Version */}
                <StatusCard
                  title="Version"
                  value={stats.ollama.version}
                  backgroundColor={`${currentTheme.colors.bgTertiary}30`}
                  textSecondaryColor={currentTheme.colors.textSecondary}
                  textPrimaryColor={currentTheme.colors.textPrimary}
                />
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <div className="text-center py-8" style={{ color: currentTheme.colors.textSecondary }}>
            No system statistics available
          </div>
        </Card>
      )}
    </div>
  );
};

export default SystemStats;