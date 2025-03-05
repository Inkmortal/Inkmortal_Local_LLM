import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../ui/Card';
import { SystemStats } from '../../types/AdminTypes';

interface SystemStatsPanelProps {
  stats: SystemStats;
  accentColors: {
    primary: string;
    secondary: string;
    tertiary: string;
    success: string;
    error: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    bgTertiary: string;
  };
}

const SystemStatsPanel: React.FC<SystemStatsPanelProps> = ({ stats, accentColors }) => {
  const navigate = useNavigate();

  // Helper function to handle system stats that might be objects
  const getCpuValue = () => {
    return typeof stats.cpu === 'object' ? (stats.cpu?.usage || 0) : stats.cpu;
  }
  
  const getMemoryValue = () => {
    return typeof stats.memory === 'object' ? (stats.memory?.percentage || 0) : stats.memory;
  }
  
  const getStorageValue = () => {
    return typeof stats.storage === 'object' ? (stats.storage?.percentage || 0) : stats.storage;
  }

  return (
    <Card title="System Stats" className="lg:col-span-1">
      <div className="space-y-5">
        <div>
          <div className="flex justify-between mb-2 items-center">
            <span className="font-medium">CPU Usage</span>
            <span className="font-mono font-medium" style={{ color: accentColors.primary }}>
              {getCpuValue()}%
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: `${accentColors.bgTertiary}60` }}>
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${getCpuValue()}%`,
                background: `linear-gradient(to right, ${accentColors.primary}, ${accentColors.secondary})`,
                boxShadow: Number(getCpuValue()) > 80 ? `0 0 8px ${accentColors.primary}` : 'none'
              }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-2 items-center">
            <span className="font-medium">Memory Usage</span>
            <span className="font-mono font-medium" style={{ 
              color: Number(getMemoryValue()) > 80 ? accentColors.error : accentColors.secondary
            }}>
              {getMemoryValue()}%
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: `${accentColors.bgTertiary}60` }}>
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${getMemoryValue()}%`,
                background: Number(getMemoryValue()) > 80 
                  ? `linear-gradient(to right, ${accentColors.error}, ${accentColors.error}80)` 
                  : `linear-gradient(to right, ${accentColors.secondary}, ${accentColors.tertiary})`,
                boxShadow: Number(getMemoryValue()) > 80 ? `0 0 8px ${accentColors.error}` : 'none'
              }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-2 items-center">
            <span className="font-medium">Storage</span>
            <span className="font-mono font-medium" style={{ color: accentColors.tertiary }}>
              {getStorageValue()}%
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: `${accentColors.bgTertiary}60` }}>
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${getStorageValue()}%`,
                background: `linear-gradient(to right, ${accentColors.tertiary}, ${accentColors.success})`,
              }}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t" style={{ borderColor: `${accentColors.borderColor}40` }}>
          <div>
            <p className="text-sm font-medium" style={{ color: accentColors.textMuted }}>Uptime</p>
            <p className="font-medium mt-1">{typeof stats.uptime === 'string' ? stats.uptime : 'Unknown'}</p>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: accentColors.textMuted }}>Ollama Status</p>
            <div className="flex items-center mt-1">
              <div 
                className="w-2 h-2 rounded-full mr-2 relative inline-block"
                style={{ 
                  backgroundColor: stats.ollama.status === 'Running' ? accentColors.success : accentColors.error,
                  boxShadow: `0 0 6px ${stats.ollama.status === 'Running' ? accentColors.success : accentColors.error}`
                }}
              >
                {stats.ollama.status === 'Running' && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-75"
                    style={{ backgroundColor: accentColors.success }}
                  />
                )}
              </div>
              <span className="font-medium" style={{ 
                color: stats.ollama.status === 'Running' ? accentColors.success : accentColors.error
              }}>
                {stats.ollama.status}
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: accentColors.textMuted }}>Queue Status</p>
            <div className="flex items-center mt-1">
              <div 
                className="w-2 h-2 rounded-full mr-2 relative inline-block"
                style={{ 
                  backgroundColor: stats.queue_connected ? accentColors.success : accentColors.error,
                  boxShadow: `0 0 6px ${stats.queue_connected ? accentColors.success : accentColors.error}`
                }}
              >
                {stats.queue_connected && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-75"
                    style={{ backgroundColor: accentColors.success }}
                  />
                )}
              </div>
              <span className="font-medium" style={{ 
                color: stats.queue_connected ? accentColors.success : accentColors.error
              }}>
                {stats.queue_connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: accentColors.textMuted }}>Model</p>
            <p className="font-medium mt-1">{typeof stats.ollama.model === 'string' ? stats.ollama.model : (typeof stats.ollama.model === 'object' ? JSON.stringify(stats.ollama.model) : 'Unknown')}</p>
          </div>
        </div>

        <button 
          className="mt-4 py-2.5 text-center rounded-lg w-full transition-all hover:scale-102"
          style={{ 
            background: `linear-gradient(to right, ${accentColors.primary}20, ${accentColors.secondary}20)`,
            color: accentColors.primary,
            boxShadow: `0 2px 8px ${accentColors.primary}20`
          }}
          onClick={() => navigate('/admin/stats')}
        >
          Detailed Stats
        </button>
      </div>
    </Card>
  );
};

export default SystemStatsPanel;