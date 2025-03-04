import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/ui/Card';
import { fetchSystemStats, SystemStats as SystemStatsType } from './AdminDashboardData';

// Extended interface for detailed system stats display
interface SystemStatsData {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    percentage: number;
  };
  storage: {
    total: number;
    used: number;
    percentage: number;
  };
  network: {
    incoming: number;
    outgoing: number;
    connections: number;
  };
  uptime: {
    days: number;
    hours: number;
    minutes: number;
  };
  ollama: {
    status: string;
    model: string;
    version: string;
    requests: number;
    avgResponseTime: number;
  };
}

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
  
  // System health statuses
  const systemHealthStatuses = {
    good: { label: 'Good', color: currentTheme.colors.success },
    warning: { label: 'Warning', color: currentTheme.colors.warning },
    critical: { label: 'Critical', color: currentTheme.colors.error },
  };
  
  // Helper function to determine system health
  const determineSystemHealth = (stats: SystemStatsData) => {
    // CPU health
    const cpuHealth = stats.cpu.usage < 70 
      ? 'good' 
      : stats.cpu.usage < 90 
        ? 'warning' 
        : 'critical';
    
    // Memory health
    const memoryHealth = stats.memory.percentage < 70 
      ? 'good' 
      : stats.memory.percentage < 90 
        ? 'warning' 
        : 'critical';
    
    // Storage health
    const storageHealth = stats.storage.percentage < 70 
      ? 'good' 
      : stats.storage.percentage < 90 
        ? 'warning' 
        : 'critical';
    
    // Overall system health (worst of all subsystems)
    const overallHealth = [cpuHealth, memoryHealth, storageHealth].includes('critical') 
      ? 'critical' 
      : [cpuHealth, memoryHealth, storageHealth].includes('warning') 
        ? 'warning' 
        : 'good';
    
    return {
      cpu: cpuHealth,
      memory: memoryHealth,
      storage: storageHealth,
      overall: overallHealth,
      ollama: stats.ollama.status === 'Running' ? 'good' : 'critical'
    };
  };
  
  // Convert basic stats to detailed format
  const convertToDetailedStats = (basicStats: SystemStatsType): SystemStatsData => {
    const uptimeParts = basicStats.uptime.split(/[, ]+/);
    const days = parseInt(uptimeParts.find(p => p.includes('day')) || '0');
    const hours = parseInt(uptimeParts.find(p => p.includes('hour')) || '0');
    
    return {
      cpu: {
        usage: basicStats.cpu,
        cores: 0, // Default value
        model: 'Unknown CPU'
      },
      memory: {
        total: 0, // Default value
        used: 0, // Default value
        percentage: basicStats.memory
      },
      storage: {
        total: 0, // Default value
        used: 0, // Default value
        percentage: basicStats.storage
      },
      network: {
        incoming: 0, // Default value
        outgoing: 0, // Default value
        connections: 0 // Default value
      },
      uptime: {
        days,
        hours,
        minutes: 0 // Default value
      },
      ollama: {
        status: basicStats.ollama.status,
        model: basicStats.ollama.model,
        version: basicStats.ollama.version,
        requests: 0, // Default value
        avgResponseTime: 0 // Default value
      }
    };
  };
  
  // Format sizes in GB
  const formatGB = (sizeInGB: number) => {
    if (sizeInGB < 0.1) {
      return `${Math.round(sizeInGB * 1024)} MB`;
    }
    return `${sizeInGB.toFixed(1)} GB`;
  };
  
  // Fetch system stats
  const fetchStats = async () => {
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
  };
  
  // Initial data load
  useEffect(() => {
    fetchStats();
    
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
  }, [refreshInterval, autoRefresh]);
  
  // Handle refresh now
  const handleRefresh = () => {
    fetchStats();
  };
  
  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };
  
  // Handle refresh interval change
  const handleRefreshIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRefreshInterval(parseInt(e.target.value));
  };
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, navigate]);
  
  // Get uptime string
  const formatUptime = (uptime: { days: number, hours: number, minutes: number }) => {
    const parts = [];
    if (uptime.days > 0) parts.push(`${uptime.days} day${uptime.days !== 1 ? 's' : ''}`);
    if (uptime.hours > 0) parts.push(`${uptime.hours} hour${uptime.hours !== 1 ? 's' : ''}`);
    if (uptime.minutes > 0) parts.push(`${uptime.minutes} minute${uptime.minutes !== 1 ? 's' : ''}`);
    return parts.join(', ') || 'Just started';
  };
  
  return (
    <div className="mb-8 pb-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
          System Statistics
        </h1>
        <div className="mt-2 sm:mt-0 flex items-center space-x-4">
          {lastUpdated && (
            <div className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={handleRefresh}
            className="p-2 rounded-md text-sm"
            style={{ 
              backgroundColor: currentTheme.colors.bgSecondary,
              color: currentTheme.colors.textSecondary,
              border: `1px solid ${currentTheme.colors.borderColor}`
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>
      </div>
      
      {/* Auto-refresh controls */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <label 
              htmlFor="auto-refresh" 
              className="flex items-center cursor-pointer"
              style={{ color: currentTheme.colors.textSecondary }}
            >
              <input
                id="auto-refresh"
                type="checkbox"
                checked={autoRefresh}
                onChange={toggleAutoRefresh}
                className="mr-2"
              />
              Auto-refresh
            </label>
            
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={handleRefreshIntervalChange}
                className="p-1 rounded-md text-sm"
                style={{
                  backgroundColor: currentTheme.colors.bgTertiary,
                  color: currentTheme.colors.textPrimary,
                  border: `1px solid ${currentTheme.colors.borderColor}`
                }}
              >
                <option value={10000}>Every 10 seconds</option>
                <option value={30000}>Every 30 seconds</option>
                <option value={60000}>Every minute</option>
                <option value={300000}>Every 5 minutes</option>
              </select>
            )}
          </div>
        </div>
      </Card>
      
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
          <Card title="System Health">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col items-center p-4 rounded-lg"
                style={{ backgroundColor: systemHealthStatuses[determineSystemHealth(stats).overall].color + '20' }}
              >
                <div className="text-lg font-bold mb-1" style={{ color: systemHealthStatuses[determineSystemHealth(stats).overall].color }}>
                  {systemHealthStatuses[determineSystemHealth(stats).overall].label}
                </div>
                <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                  Overall System Health
                </div>
              </div>
              
              <div className="flex flex-col items-center p-4 rounded-lg"
                style={{ backgroundColor: systemHealthStatuses[determineSystemHealth(stats).cpu].color + '20' }}
              >
                <div className="text-lg font-bold mb-1" style={{ color: systemHealthStatuses[determineSystemHealth(stats).cpu].color }}>
                  {stats.cpu.usage.toFixed(1)}%
                </div>
                <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                  CPU Usage
                </div>
              </div>
              
              <div className="flex flex-col items-center p-4 rounded-lg"
                style={{ backgroundColor: systemHealthStatuses[determineSystemHealth(stats).memory].color + '20' }}
              >
                <div className="text-lg font-bold mb-1" style={{ color: systemHealthStatuses[determineSystemHealth(stats).memory].color }}>
                  {stats.memory.percentage.toFixed(1)}%
                </div>
                <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                  Memory Usage
                </div>
              </div>
              
              <div className="flex flex-col items-center p-4 rounded-lg"
                style={{ backgroundColor: systemHealthStatuses[determineSystemHealth(stats).storage].color + '20' }}
              >
                <div className="text-lg font-bold mb-1" style={{ color: systemHealthStatuses[determineSystemHealth(stats).storage].color }}>
                  {stats.storage.percentage.toFixed(1)}%
                </div>
                <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                  Storage Usage
                </div>
              </div>
            </div>
          </Card>
          
          {/* CPU Stats */}
          <Card title="CPU">
            <div className="md:flex items-start justify-between">
              <div className="mb-4 md:mb-0">
                <h3 className="text-lg font-medium mb-2" style={{ color: currentTheme.colors.textPrimary }}>
                  CPU Usage
                </h3>
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
                    {stats.cpu.usage.toFixed(1)}%
                  </div>
                </div>
                
                {stats.cpu.cores > 0 && (
                  <div className="mt-2 text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                    {stats.cpu.cores} Cores
                  </div>
                )}
                
                {stats.cpu.model && (
                  <div className="mt-1 text-sm" style={{ color: currentTheme.colors.textMuted }}>
                    {stats.cpu.model}
                  </div>
                )}
              </div>
              
              <div className="w-full md:w-2/3 lg:w-1/2 h-8 rounded-full overflow-hidden"
                style={{ backgroundColor: currentTheme.colors.bgTertiary }}
              >
                <div 
                  className="h-full"
                  style={{ 
                    width: `${stats.cpu.usage}%`,
                    backgroundColor: stats.cpu.usage < 70 
                      ? currentTheme.colors.success 
                      : stats.cpu.usage < 90 
                        ? currentTheme.colors.warning 
                        : currentTheme.colors.error
                  }}
                />
              </div>
            </div>
          </Card>
          
          {/* Memory Stats */}
          <Card title="Memory">
            <div className="md:flex items-start justify-between">
              <div className="mb-4 md:mb-0">
                <h3 className="text-lg font-medium mb-2" style={{ color: currentTheme.colors.textPrimary }}>
                  Memory Usage
                </h3>
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
                    {stats.memory.percentage.toFixed(1)}%
                  </div>
                </div>
                
                {stats.memory.total > 0 && (
                  <div className="mt-2 text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                    {formatGB(stats.memory.used)} / {formatGB(stats.memory.total)}
                  </div>
                )}
              </div>
              
              <div className="w-full md:w-2/3 lg:w-1/2 h-8 rounded-full overflow-hidden"
                style={{ backgroundColor: currentTheme.colors.bgTertiary }}
              >
                <div 
                  className="h-full"
                  style={{ 
                    width: `${stats.memory.percentage}%`,
                    backgroundColor: stats.memory.percentage < 70 
                      ? currentTheme.colors.success 
                      : stats.memory.percentage < 90 
                        ? currentTheme.colors.warning 
                        : currentTheme.colors.error
                  }}
                />
              </div>
            </div>
          </Card>
          
          {/* Storage Stats */}
          <Card title="Storage">
            <div className="md:flex items-start justify-between">
              <div className="mb-4 md:mb-0">
                <h3 className="text-lg font-medium mb-2" style={{ color: currentTheme.colors.textPrimary }}>
                  Storage Usage
                </h3>
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
                    {stats.storage.percentage.toFixed(1)}%
                  </div>
                </div>
                
                {stats.storage.total > 0 && (
                  <div className="mt-2 text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                    {formatGB(stats.storage.used)} / {formatGB(stats.storage.total)}
                  </div>
                )}
              </div>
              
              <div className="w-full md:w-2/3 lg:w-1/2 h-8 rounded-full overflow-hidden"
                style={{ backgroundColor: currentTheme.colors.bgTertiary }}
              >
                <div 
                  className="h-full"
                  style={{ 
                    width: `${stats.storage.percentage}%`,
                    backgroundColor: stats.storage.percentage < 70 
                      ? currentTheme.colors.success 
                      : stats.storage.percentage < 90 
                        ? currentTheme.colors.warning 
                        : currentTheme.colors.error
                  }}
                />
              </div>
            </div>
          </Card>
          
          {/* System Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Uptime */}
            <Card title="System Uptime">
              <div className="flex flex-col items-center p-4">
                <div className="text-xl font-bold mb-2" style={{ color: currentTheme.colors.textPrimary }}>
                  {formatUptime(stats.uptime)}
                </div>
                <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                  Since last restart
                </div>
              </div>
            </Card>
            
            {/* Ollama */}
            <Card title="Ollama Status">
              <div className="flex flex-col items-center p-4">
                <div className="text-xl font-bold mb-2" style={{ 
                  color: stats.ollama.status === 'Running' 
                    ? currentTheme.colors.success 
                    : currentTheme.colors.error 
                }}>
                  {stats.ollama.status}
                </div>
                
                <div className="text-sm mb-1" style={{ color: currentTheme.colors.textSecondary }}>
                  Model: {stats.ollama.model}
                </div>
                
                <div className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
                  Version: {stats.ollama.version}
                </div>
                
                {stats.ollama.requests > 0 && (
                  <div className="mt-2 text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                    {stats.ollama.requests.toLocaleString()} requests processed
                  </div>
                )}
                
                {stats.ollama.avgResponseTime > 0 && (
                  <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                    {stats.ollama.avgResponseTime.toFixed(2)}s average response time
                  </div>
                )}
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