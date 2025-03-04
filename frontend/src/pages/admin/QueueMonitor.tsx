import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/ui/Card';
import { 
  fetchQueueStats,
  fetchQueueItems,
  fetchHistoryItems,
  QueueItem,
  HistoryItem,
  QueueStats 
} from './AdminDashboardData';

const QueueMonitor: React.FC = () => {
  const { currentTheme } = useTheme();
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total_waiting: 0,
    total_processing: 0,
    total_completed: 0,
    total_error: 0,
    requests_per_hour: 0,
    average_wait_time: 0,
    average_processing_time: 0,
    queue_by_priority: {}
  });
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<number | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(10000); // 10 seconds default
  const refreshTimerRef = useRef<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Function to load all queue data
  const loadQueueData = async () => {
    try {
      setLoading(true);
      
      // Fetch queue stats
      const stats = await fetchQueueStats();
      if (stats) {
        setQueueStats(stats);
      }
      
      // Fetch queue items
      const items = await fetchQueueItems(selectedPriority || undefined);
      setQueueItems(items);
      
      // Fetch history items
      const history = await fetchHistoryItems(selectedPriority || undefined);
      setHistoryItems(history);
      
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error loading queue data:', err);
      setError('Failed to load queue data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Set up auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      // Clear any existing interval
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
      }
      
      // Set up new interval
      refreshTimerRef.current = window.setInterval(() => {
        loadQueueData();
      }, refreshInterval);
    } else if (refreshTimerRef.current) {
      // Clear interval if auto-refresh is disabled
      window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    // Clean up interval on component unmount
    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, selectedPriority]);
  
  // Initial data load
  useEffect(() => {
    loadQueueData();
  }, [selectedPriority]);
  
  // Update refresh interval
  const handleRefreshIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const interval = parseInt(e.target.value);
    setRefreshInterval(interval);
  };
  
  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };
  
  // Manual refresh
  const handleManualRefresh = () => {
    loadQueueData();
  };
  
  // Filter by priority
  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const priority = e.target.value === 'all' ? null : parseInt(e.target.value);
    setSelectedPriority(priority);
  };
  
  // Format time duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
    }
  };
  
  // Format date
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <div className="mb-8 pb-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
          Queue Monitor
        </h1>
        <div className="mt-2 sm:mt-0 flex items-center space-x-4">
          <div className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <button
            onClick={handleManualRefresh}
            className="p-2 rounded-md text-sm"
            style={{ 
              backgroundColor: currentTheme.colors.bgSecondary,
              color: currentTheme.colors.textSecondary,
              border: `1px solid ${currentTheme.colors.borderColor}`
            }}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>
      </div>
      
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
      
      {/* Controls */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                <option value={5000}>Every 5 seconds</option>
                <option value={10000}>Every 10 seconds</option>
                <option value={30000}>Every 30 seconds</option>
                <option value={60000}>Every minute</option>
              </select>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <label 
              htmlFor="priority-filter" 
              className="text-sm"
              style={{ color: currentTheme.colors.textSecondary }}
            >
              Priority Filter:
            </label>
            <select
              id="priority-filter"
              value={selectedPriority === null ? 'all' : selectedPriority.toString()}
              onChange={handlePriorityChange}
              className="p-1 rounded-md text-sm"
              style={{
                backgroundColor: currentTheme.colors.bgTertiary,
                color: currentTheme.colors.textPrimary,
                border: `1px solid ${currentTheme.colors.borderColor}`
              }}
            >
              <option value="all">All Priorities</option>
              <option value="1">High (1)</option>
              <option value="2">Medium (2)</option>
              <option value="3">Low (3)</option>
            </select>
          </div>
        </div>
      </Card>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
              {queueStats.total_waiting}
            </div>
            <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
              Waiting in Queue
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: currentTheme.colors.warning }}>
              {queueStats.total_processing}
            </div>
            <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
              Currently Processing
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: currentTheme.colors.success }}>
              {queueStats.total_completed}
            </div>
            <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
              Completed (Last 24h)
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: currentTheme.colors.error }}>
              {queueStats.total_error}
            </div>
            <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
              Errors (Last 24h)
            </div>
          </div>
        </Card>
      </div>
      
      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: currentTheme.colors.textPrimary }}>
              {queueStats.requests_per_hour.toFixed(1)}
            </div>
            <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
              Requests/Hour
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: currentTheme.colors.textPrimary }}>
              {formatDuration(queueStats.average_wait_time)}
            </div>
            <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
              Average Wait Time
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: currentTheme.colors.textPrimary }}>
              {formatDuration(queueStats.average_processing_time)}
            </div>
            <div className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
              Average Processing Time
            </div>
          </div>
        </Card>
      </div>
      
      {/* Current Queue */}
      <Card title="Current Queue" className="mb-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-t-transparent rounded-full mb-2"
              style={{ borderColor: `${currentTheme.colors.accentPrimary}40`, borderTopColor: 'transparent' }}
            />
            <p style={{ color: currentTheme.colors.textSecondary }}>Loading queue data...</p>
          </div>
        ) : queueItems.length === 0 ? (
          <div className="text-center py-8" style={{ color: currentTheme.colors.textSecondary }}>
            No items currently in queue
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full" style={{ color: currentTheme.colors.textPrimary }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}` }}>
                  <th className="p-3 text-left font-medium">ID</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Priority</th>
                  <th className="p-3 text-left font-medium">User</th>
                  <th className="p-3 text-left font-medium">Created</th>
                  <th className="p-3 text-left font-medium">Wait Time</th>
                </tr>
              </thead>
              <tbody>
                {queueItems.map((item) => (
                  <tr 
                    key={item.id}
                    style={{ 
                      borderBottom: `1px solid ${currentTheme.colors.borderColor}30`,
                      backgroundColor: item.status === 'processing' ? `${currentTheme.colors.warning}10` : 'transparent'
                    }}
                  >
                    <td className="p-3 font-mono">{item.id.substring(0, 8)}...</td>
                    <td className="p-3">
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: item.status === 'waiting' 
                            ? `${currentTheme.colors.info}20` 
                            : `${currentTheme.colors.warning}20`,
                          color: item.status === 'waiting' 
                            ? currentTheme.colors.info 
                            : currentTheme.colors.warning
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {item.priority === 1 ? 'High' : item.priority === 2 ? 'Medium' : 'Low'}
                    </td>
                    <td className="p-3">{item.username}</td>
                    <td className="p-3">{formatDateTime(item.created_at)}</td>
                    <td className="p-3">
                      {item.queue_wait_time ? formatDuration(item.queue_wait_time) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      {/* Recent History */}
      <Card title="Recent Completions">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-t-transparent rounded-full mb-2"
              style={{ borderColor: `${currentTheme.colors.accentPrimary}40`, borderTopColor: 'transparent' }}
            />
            <p style={{ color: currentTheme.colors.textSecondary }}>Loading history data...</p>
          </div>
        ) : historyItems.length === 0 ? (
          <div className="text-center py-8" style={{ color: currentTheme.colors.textSecondary }}>
            No recent completions
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full" style={{ color: currentTheme.colors.textPrimary }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}` }}>
                  <th className="p-3 text-left font-medium">ID</th>
                  <th className="p-3 text-left font-medium">User</th>
                  <th className="p-3 text-left font-medium">Priority</th>
                  <th className="p-3 text-left font-medium">Completed</th>
                  <th className="p-3 text-left font-medium">Processing Time</th>
                  <th className="p-3 text-left font-medium">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {historyItems.map((item) => (
                  <tr 
                    key={item.id}
                    style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}30` }}
                  >
                    <td className="p-3 font-mono">{item.id.substring(0, 8)}...</td>
                    <td className="p-3">{item.username}</td>
                    <td className="p-3">
                      {item.priority === 1 ? 'High' : item.priority === 2 ? 'Medium' : 'Low'}
                    </td>
                    <td className="p-3">{formatDateTime(item.completed_at)}</td>
                    <td className="p-3">{formatDuration(item.processing_time)}</td>
                    <td className="p-3">
                      {item.total_tokens ? item.total_tokens.toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default QueueMonitor;