import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import { fetchApi } from '../../config/api';

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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // System stats state
  const [stats, setStats] = useState<SystemStatsData>({
    cpu: {
      usage: 0,
      cores: 0,
      model: 'Loading...'
    },
    memory: {
      total: 0,
      used: 0,
      percentage: 0
    },
    storage: {
      total: 0,
      used: 0,
      percentage: 0
    },
    network: {
      incoming: 0,
      outgoing: 0,
      connections: 0
    },
    uptime: {
      days: 0,
      hours: 0,
      minutes: 0
    },
    ollama: {
      status: 'Loading',
      model: 'Loading...',
      version: 'Loading...',
      requests: 0,
      avgResponseTime: 0
    }
  });

  // Fetch system stats
  const fetchSystemStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetchApi('/admin/system/stats');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch system stats: ${response.status}`);
      }
      
      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (error) {
      console.error('Error fetching system stats:', error);
      setError('Failed to load system statistics');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch stats on component mount and set up interval
  useEffect(() => {
    fetchSystemStats();
    
    const interval = setInterval(() => {
      fetchSystemStats();
    }, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Format GB
  const formatGB = (gb: number) => {
    return gb < 100 ? gb.toFixed(1) : Math.round(gb);
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
          System Statistics
        </h1>
        <div className="mt-2 sm:mt-0">
          <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-md" style={{ backgroundColor: `${currentTheme.colors.error}20`, color: currentTheme.colors.error }}>
          {error}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && !error && (
        <div className="text-center py-2 mb-4" style={{ color: currentTheme.colors.textSecondary }}>
          Loading system statistics...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="flex flex-col">
          <h3 className="text-sm font-medium mb-1" style={{ color: currentTheme.colors.textSecondary }}>
            CPU Usage
          </h3>
          <p className="text-2xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
            {stats.cpu.usage}%
          </p>
          <div className="mt-2 mb-1 flex justify-between text-xs">
            <span style={{ color: currentTheme.colors.textMuted }}>{stats.cpu.cores} Cores</span>
            <span style={{ color: currentTheme.colors.textMuted }}>{stats.cpu.model}</span>
          </div>
          <div 
            className="mt-auto h-2 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: currentTheme.colors.bgTertiary }}
          >
            <div 
              className="h-full rounded-full"
              style={{ 
                width: `${stats.cpu.usage}%`,
                backgroundColor: currentTheme.colors.accentPrimary
              }}
            />
          </div>
        </Card>
        
        <Card className="flex flex-col">
          <h3 className="text-sm font-medium mb-1" style={{ color: currentTheme.colors.textSecondary }}>
            Memory
          </h3>
          <p className="text-2xl font-bold" style={{ color: currentTheme.colors.accentSecondary }}>
            {stats.memory.percentage}%
          </p>
          <div className="mt-2 mb-1 flex justify-between text-xs">
            <span style={{ color: currentTheme.colors.textMuted }}>
              {formatGB(stats.memory.used)} GB used
            </span>
            <span style={{ color: currentTheme.colors.textMuted }}>
              {stats.memory.total} GB total
            </span>
          </div>
          <div 
            className="mt-auto h-2 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: currentTheme.colors.bgTertiary }}
          >
            <div 
              className="h-full rounded-full"
              style={{ 
                width: `${stats.memory.percentage}%`,
                backgroundColor: currentTheme.colors.accentSecondary
              }}
            />
          </div>
        </Card>
        
        <Card className="flex flex-col">
          <h3 className="text-sm font-medium mb-1" style={{ color: currentTheme.colors.textSecondary }}>
            Storage
          </h3>
          <p className="text-2xl font-bold" style={{ color: currentTheme.colors.accentTertiary }}>
            {stats.storage.percentage}%
          </p>
          <div className="mt-2 mb-1 flex justify-between text-xs">
            <span style={{ color: currentTheme.colors.textMuted }}>
              {formatGB(stats.storage.used)} GB used
            </span>
            <span style={{ color: currentTheme.colors.textMuted }}>
              {stats.storage.total} GB total
            </span>
          </div>
          <div 
            className="mt-auto h-2 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: currentTheme.colors.bgTertiary }}
          >
            <div 
              className="h-full rounded-full"
              style={{ 
                width: `${stats.storage.percentage}%`,
                backgroundColor: currentTheme.colors.accentTertiary
              }}
            />
          </div>
        </Card>
        
        <Card className="flex flex-col">
          <h3 className="text-sm font-medium mb-1" style={{ color: currentTheme.colors.textSecondary }}>
            Uptime
          </h3>
          <p className="text-2xl font-bold" style={{ color: currentTheme.colors.success }}>
            {stats.uptime.days}d {stats.uptime.hours}h
          </p>
          <div className="mt-2 mb-1 flex justify-between text-xs">
            <span style={{ color: currentTheme.colors.textMuted }}>
              System running since
            </span>
            <span style={{ color: currentTheme.colors.textMuted }}>
              {new Date(Date.now() - (stats.uptime.days * 24 * 60 * 60 * 1000 + 
                                    stats.uptime.hours * 60 * 60 * 1000 + 
                                    stats.uptime.minutes * 60 * 1000)).toLocaleDateString()}
            </span>
          </div>
          <div 
            className="mt-auto h-2 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: currentTheme.colors.bgTertiary }}
          >
            <div 
              className="h-full rounded-full"
              style={{ 
                width: '100%',
                backgroundColor: currentTheme.colors.success
              }}
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ollama Status */}
        <Card title="Ollama Status" className="lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span style={{ color: currentTheme.colors.textSecondary }}>Status</span>
              <span 
                className="px-2 py-1 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: stats.ollama.status === 'Running' ? 
                    `${currentTheme.colors.success}20` : `${currentTheme.colors.error}20`,
                  color: stats.ollama.status === 'Running' ? 
                    currentTheme.colors.success : currentTheme.colors.error
                }}
              >
                {stats.ollama.status}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span style={{ color: currentTheme.colors.textSecondary }}>Model</span>
              <span style={{ color: currentTheme.colors.textPrimary }}>
                {stats.ollama.model}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span style={{ color: currentTheme.colors.textSecondary }}>Version</span>
              <span style={{ color: currentTheme.colors.textPrimary }}>
                {stats.ollama.version}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span style={{ color: currentTheme.colors.textSecondary }}>Total Requests</span>
              <span style={{ color: currentTheme.colors.textPrimary }}>
                {stats.ollama.requests.toLocaleString()}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span style={{ color: currentTheme.colors.textSecondary }}>Avg Response Time</span>
              <span style={{ color: currentTheme.colors.textPrimary }}>
                {stats.ollama.avgResponseTime}s
              </span>
            </div>
          </div>
        </Card>

        {/* Network Stats */}
        <Card title="Network Activity" className="lg:col-span-2">
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>Connections</div>
                <div className="text-xl font-bold" style={{ color: currentTheme.colors.textPrimary }}>
                  {stats.network.connections}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>Incoming</div>
                <div className="text-xl font-bold" style={{ color: currentTheme.colors.success }}>
                  {stats.network.incoming} MB/s
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>Outgoing</div>
                <div className="text-xl font-bold" style={{ color: currentTheme.colors.warning }}>
                  {stats.network.outgoing} MB/s
                </div>
              </div>
            </div>
            <div className="text-center text-sm" style={{ color: currentTheme.colors.textMuted }}>
              Detailed network statistics visualization will be implemented in a future update.
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default SystemStats;