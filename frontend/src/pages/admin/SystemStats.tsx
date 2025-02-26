import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';

const SystemStats: React.FC = () => {
  const { currentTheme } = useTheme();
  
  // Mock system stats
  const stats = {
    cpu: {
      usage: 35,
      cores: 12,
      model: 'Mac Mini M4 Pro'
    },
    memory: {
      total: 64,
      used: 21.3,
      percentage: 33
    },
    storage: {
      total: 1024,
      used: 384,
      percentage: 37
    },
    network: {
      incoming: 12.5,
      outgoing: 8.3,
      connections: 24
    },
    uptime: {
      days: 15,
      hours: 8,
      minutes: 43
    },
    ollama: {
      status: 'Running',
      model: 'Llama 3.3 70B',
      version: '0.2.1',
      requests: 2567,
      avgResponseTime: 2.3
    }
  };

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
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>

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
                  backgroundColor: `${currentTheme.colors.success}20`,
                  color: currentTheme.colors.success
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
          <div className="p-4 text-center">
            <p className="mb-4" style={{ color: currentTheme.colors.textSecondary }}>
              Network statistics visualization will be implemented in a future update.
            </p>
            <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
              Current connections: {stats.network.connections} | 
              Incoming: {stats.network.incoming} MB/s | 
              Outgoing: {stats.network.outgoing} MB/s
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default SystemStats;