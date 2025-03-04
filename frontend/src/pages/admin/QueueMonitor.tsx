import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/ui/Card';
import { fetchApi } from '../../config/api';

// Define types for queue data
interface QueueItem {
  id: string;
  priority: number;
  status: string;
  created_at: string;
  user_id: string;
  username: string;
  prompt_tokens?: number;
  max_tokens?: number;
  model?: string;
  queue_wait_time?: number;
}

interface HistoryItem extends QueueItem {
  completed_at: string;
  processing_time: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface QueueStats {
  total_waiting: number;
  total_processing: number;
  total_completed: number;
  total_error: number;
  requests_per_hour: number;
  average_wait_time: number;
  average_processing_time: number;
  queue_by_priority?: Record<string, number>;
}

// Component for the Queue Monitor in the admin dashboard
const QueueMonitor: React.FC = () => {
  const { currentTheme } = useTheme();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total_waiting: 0,
    total_processing: 0,
    total_completed: 0,
    total_error: 0,
    requests_per_hour: 0,
    average_wait_time: 0,
    average_processing_time: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch queue statistics
  const fetchQueueStats = async () => {
    try {
      const response = await fetchApi<QueueStats>('/admin/queue/stats');
      
      if (!response.success) {
        throw new Error(`Failed to fetch queue stats: ${response.error || response.status}`);
      }
      
      if (response.data) {
        setQueueStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching queue stats:', error);
      setError('Failed to load queue statistics');
    }
  };

  // Fetch queue items
  const fetchQueueItems = async () => {
    try {
      // Fetch current queue items
      const priorityParam = selectedPriority ? `?priority=${selectedPriority}` : '';
      const response = await fetchApi<QueueItem[]>(`/admin/queue/items${priorityParam}`);
      
      if (!response.success) {
        throw new Error(`Failed to fetch queue items: ${response.error || response.status}`);
      }
      
      if (response.data) {
        setQueueItems(response.data);
      }
    } catch (error) {
      console.error('Error fetching queue items:', error);
      setError('Failed to load queue items');
    }
  };

  // Fetch history items
  const fetchHistoryItems = async () => {
    try {
      const priorityParam = selectedPriority ? `?priority=${selectedPriority}` : '';
      const response = await fetchApi<HistoryItem[]>(`/admin/queue/history${priorityParam}`);
      
      if (!response.success) {
        throw new Error(`Failed to fetch history items: ${response.error || response.status}`);
      }
      
      if (response.data) {
        setHistoryItems(response.data);
      }
    } catch (error) {
      console.error('Error fetching history items:', error);
      setError('Failed to load history items');
    }
  };

  // Load all data
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchQueueStats(),
        fetchQueueItems(),
        fetchHistoryItems()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load queue data');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle priority filter change
  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedPriority(value === 'all' ? null : parseInt(value, 10));
  };

  // Toggle auto refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // Format date strings
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Format time duration in seconds
  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    loadData();
  }, [selectedPriority]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        loadData();
      }, 5000); // Refresh every 5 seconds
    } else if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh]);

  return (
    <div className="pb-8">
      <div className="flex justify-between items-center mb-6">
        <h1 
          className="text-2xl font-bold"
          style={{ color: currentTheme.colors.accentPrimary }}
        >
          Queue Monitor
        </h1>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <label 
              htmlFor="priority-filter" 
              className="mr-2"
              style={{ color: currentTheme.colors.textSecondary }}
            >
              Priority:
            </label>
            <select
              id="priority-filter"
              value={selectedPriority === null ? 'all' : selectedPriority}
              onChange={handlePriorityChange}
              className="border rounded p-1"
              style={{
                backgroundColor: currentTheme.colors.bgSecondary,
                color: currentTheme.colors.textPrimary,
                borderColor: currentTheme.colors.borderColor,
              }}
            >
              <option value="all">All</option>
              <option value="1">High (1)</option>
              <option value="2">Medium (2)</option>
              <option value="3">Low (3)</option>
            </select>
          </div>
          
          <button
            onClick={loadData}
            className="px-3 py-1 rounded"
            style={{
              backgroundColor: currentTheme.colors.bgTertiary,
              color: currentTheme.colors.textPrimary,
              borderColor: currentTheme.colors.borderColor,
            }}
          >
            Refresh
          </button>
          
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="hidden"
              checked={autoRefresh}
              onChange={toggleAutoRefresh}
            />
            <span 
              className={`w-10 h-5 rounded-full transition-colors duration-200 ${
                autoRefresh ? 'bg-green-500' : 'bg-gray-400'
              } flex items-center ${autoRefresh ? 'justify-end' : 'justify-start'}`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 mx-0.5"></span>
            </span>
            <span 
              className="ml-2 text-sm" 
              style={{ color: currentTheme.colors.textSecondary }}
            >
              Auto Refresh
            </span>
          </label>
        </div>
      </div>
      
      {error && (
        <div 
          className="mb-6 p-4 rounded-lg"
          style={{
            backgroundColor: `${currentTheme.colors.error}20`,
            color: currentTheme.colors.error,
          }}
        >
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin h-8 w-8 border-4 rounded-full border-t-transparent" style={{
            borderColor: `${currentTheme.colors.accentPrimary}40`,
            borderTopColor: 'transparent',
          }}></div>
          <span className="ml-2">Loading queue data...</span>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <div className="p-4">
                <h3 
                  className="text-lg font-medium mb-2"
                  style={{ color: currentTheme.colors.textSecondary }}
                >
                  Waiting
                </h3>
                <div 
                  className="text-3xl font-bold"
                  style={{ color: currentTheme.colors.accentPrimary }}
                >
                  {queueStats.total_waiting}
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="p-4">
                <h3 
                  className="text-lg font-medium mb-2"
                  style={{ color: currentTheme.colors.textSecondary }}
                >
                  Processing
                </h3>
                <div 
                  className="text-3xl font-bold"
                  style={{ color: currentTheme.colors.accentSecondary }}
                >
                  {queueStats.total_processing}
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="p-4">
                <h3 
                  className="text-lg font-medium mb-2"
                  style={{ color: currentTheme.colors.textSecondary }}
                >
                  Completed
                </h3>
                <div 
                  className="text-3xl font-bold"
                  style={{ color: currentTheme.colors.success }}
                >
                  {queueStats.total_completed}
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="p-4">
                <h3 
                  className="text-lg font-medium mb-2"
                  style={{ color: currentTheme.colors.textSecondary }}
                >
                  Errors
                </h3>
                <div 
                  className="text-3xl font-bold"
                  style={{ color: currentTheme.colors.error }}
                >
                  {queueStats.total_error}
                </div>
              </div>
            </Card>
          </div>
          
          {/* Performance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <div className="p-4">
                <h3 
                  className="text-lg font-medium mb-2"
                  style={{ color: currentTheme.colors.textSecondary }}
                >
                  Requests Per Hour
                </h3>
                <div 
                  className="text-2xl font-bold"
                  style={{ color: currentTheme.colors.textPrimary }}
                >
                  {queueStats.requests_per_hour.toFixed(1)}
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="p-4">
                <h3 
                  className="text-lg font-medium mb-2"
                  style={{ color: currentTheme.colors.textSecondary }}
                >
                  Avg. Wait Time
                </h3>
                <div 
                  className="text-2xl font-bold"
                  style={{ color: currentTheme.colors.textPrimary }}
                >
                  {formatDuration(queueStats.average_wait_time)}
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="p-4">
                <h3 
                  className="text-lg font-medium mb-2"
                  style={{ color: currentTheme.colors.textSecondary }}
                >
                  Avg. Processing Time
                </h3>
                <div 
                  className="text-2xl font-bold"
                  style={{ color: currentTheme.colors.textPrimary }}
                >
                  {formatDuration(queueStats.average_processing_time)}
                </div>
              </div>
            </Card>
          </div>
          
          {/* Queue Items */}
          <h2 
            className="text-xl font-bold mb-3"
            style={{ color: currentTheme.colors.accentSecondary }}
          >
            Current Queue
          </h2>
          
          <Card className="mb-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full" style={{ color: currentTheme.colors.textPrimary }}>
                <thead>
                  <tr style={{ 
                    backgroundColor: currentTheme.colors.bgTertiary,
                    borderBottom: `1px solid ${currentTheme.colors.borderColor}`,
                  }}>
                    <th className="p-3 text-left font-medium">ID</th>
                    <th className="p-3 text-left font-medium">Priority</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-left font-medium">Created</th>
                    <th className="p-3 text-left font-medium">User</th>
                    <th className="p-3 text-left font-medium">Model</th>
                    <th className="p-3 text-left font-medium">Wait Time</th>
                  </tr>
                </thead>
                <tbody>
                  {queueItems.length > 0 ? (
                    queueItems.map((item) => (
                      <tr 
                        key={item.id}
                        style={{ 
                          borderBottom: `1px solid ${currentTheme.colors.borderColor}40`,
                        }}
                      >
                        <td className="p-3">{item.id.substring(0, 8)}...</td>
                        <td className="p-3">
                          <span 
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: 
                                item.priority === 1 ? `${currentTheme.colors.success}20` :
                                item.priority === 2 ? `${currentTheme.colors.accentPrimary}20` :
                                `${currentTheme.colors.warning}20`,
                              color: 
                                item.priority === 1 ? currentTheme.colors.success :
                                item.priority === 2 ? currentTheme.colors.accentPrimary :
                                currentTheme.colors.warning,
                            }}
                          >
                            {item.priority === 1 ? 'High' : 
                             item.priority === 2 ? 'Medium' : 'Low'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span 
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: 
                                item.status === 'waiting' ? `${currentTheme.colors.warning}20` :
                                item.status === 'processing' ? `${currentTheme.colors.accentPrimary}20` :
                                `${currentTheme.colors.success}20`,
                              color: 
                                item.status === 'waiting' ? currentTheme.colors.warning :
                                item.status === 'processing' ? currentTheme.colors.accentPrimary :
                                currentTheme.colors.success,
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3">{formatDate(item.created_at)}</td>
                        <td className="p-3">{item.username || item.user_id.substring(0, 8)}</td>
                        <td className="p-3">{item.model || 'Default'}</td>
                        <td className="p-3">{formatDuration(item.queue_wait_time)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-4 text-center" style={{ color: currentTheme.colors.textSecondary }}>
                        No items in queue
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          
          {/* History Items */}
          <h2 
            className="text-xl font-bold mb-3"
            style={{ color: currentTheme.colors.accentSecondary }}
          >
            Recent Completions
          </h2>
          
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full" style={{ color: currentTheme.colors.textPrimary }}>
                <thead>
                  <tr style={{ 
                    backgroundColor: currentTheme.colors.bgTertiary,
                    borderBottom: `1px solid ${currentTheme.colors.borderColor}`,
                  }}>
                    <th className="p-3 text-left font-medium">ID</th>
                    <th className="p-3 text-left font-medium">Priority</th>
                    <th className="p-3 text-left font-medium">Completed</th>
                    <th className="p-3 text-left font-medium">User</th>
                    <th className="p-3 text-left font-medium">Wait Time</th>
                    <th className="p-3 text-left font-medium">Processing Time</th>
                    <th className="p-3 text-left font-medium">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {historyItems.length > 0 ? (
                    historyItems.map((item) => (
                      <tr 
                        key={item.id}
                        style={{ 
                          borderBottom: `1px solid ${currentTheme.colors.borderColor}40`,
                        }}
                      >
                        <td className="p-3">{item.id.substring(0, 8)}...</td>
                        <td className="p-3">
                          <span 
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: 
                                item.priority === 1 ? `${currentTheme.colors.success}20` :
                                item.priority === 2 ? `${currentTheme.colors.accentPrimary}20` :
                                `${currentTheme.colors.warning}20`,
                              color: 
                                item.priority === 1 ? currentTheme.colors.success :
                                item.priority === 2 ? currentTheme.colors.accentPrimary :
                                currentTheme.colors.warning,
                            }}
                          >
                            {item.priority === 1 ? 'High' : 
                             item.priority === 2 ? 'Medium' : 'Low'}
                          </span>
                        </td>
                        <td className="p-3">{formatDate(item.completed_at)}</td>
                        <td className="p-3">{item.username || item.user_id.substring(0, 8)}</td>
                        <td className="p-3">{formatDuration(item.queue_wait_time)}</td>
                        <td className="p-3">{formatDuration(item.processing_time)}</td>
                        <td className="p-3">
                          {item.prompt_tokens && item.completion_tokens ? 
                            `${item.prompt_tokens} / ${item.completion_tokens} = ${item.total_tokens || (item.prompt_tokens + item.completion_tokens)}` : 
                            'N/A'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-4 text-center" style={{ color: currentTheme.colors.textSecondary }}>
                        No recent completions
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default QueueMonitor;