import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { fetchApi } from '../../config/api';

interface QueueItem {
  id: string;
  priority: number;
  source: string;
  timestamp: string;
  status: 'waiting' | 'processing' | 'completed' | 'error';
  age: number; // in seconds
  retries: number;
  apiKey?: string;
  prompt?: string;
}

interface QueueStats {
  totalWaiting: number;
  totalProcessing: number;
  totalCompleted: number;
  totalError: number;
  requestsPerHour: number;
  averageWaitTime: number; // in seconds
  averageProcessingTime: number; // in seconds
}

const priorityLabels = {
  1: { name: 'High', color: '#ff5555' }, // Using Dracula red for high priority
  2: { name: 'Medium', color: '#8be9fd' }, // Using Dracula cyan for medium priority
  3: { name: 'Low', color: '#50fa7b' } // Using Dracula green for low priority
};

const QueueMonitor: React.FC = () => {
  const { currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [selectedPriority, setSelectedPriority] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for API data
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [historyItems, setHistoryItems] = useState<QueueItem[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    totalWaiting: 0,
    totalProcessing: 0,
    totalCompleted: 0,
    totalError: 0,
    requestsPerHour: 0,
    averageWaitTime: 0,
    averageProcessingTime: 0
  });

  // Fetch queue statistics
  const fetchQueueStats = async () => {
    try {
      const response = await fetchApi('/admin/queue/stats');
      if (!response.ok) {
        throw new Error(`Failed to fetch queue stats: ${response.status}`);
      }
      const data = await response.json();
      setQueueStats(data);
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
      const response = await fetchApi(`/admin/queue/items${priorityParam}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch queue items: ${response.status}`);
      }
      const data = await response.json();
      setQueueItems(data);
    } catch (error) {
      console.error('Error fetching queue items:', error);
      setError('Failed to load queue items');
    }
  };

  // Fetch history items
  const fetchHistoryItems = async () => {
    try {
      const priorityParam = selectedPriority ? `?priority=${selectedPriority}` : '';
      const response = await fetchApi(`/admin/queue/history${priorityParam}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch history items: ${response.status}`);
      }
      const data = await response.json();
      setHistoryItems(data);
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

  // Fetch data on component mount and when filter changes
  useEffect(() => {
    loadData();
    
    // Set up polling interval
    const interval = setInterval(() => {
      fetchQueueStats();
      if (activeTab === 'current') {
        fetchQueueItems();
      } else {
        fetchHistoryItems();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [selectedPriority, activeTab]);

  // Format time display
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  // Filter queue items by priority
  const filteredItems = (activeTab === 'current' ? queueItems : historyItems).filter(
    item => selectedPriority === null || item.priority === selectedPriority
  );

  // Process next queue item
  const processNextItem = async () => {
    try {
      setIsLoading(true);
      const response = await fetchApi('/admin/queue/process-next', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to process next item: ${response.status}`);
      }
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error processing next item:', error);
      setError('Failed to process next item');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear queue
  const clearQueue = async () => {
    if (!confirm('Are you sure you want to clear the queue? This cannot be undone.')) {
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetchApi('/admin/queue/clear', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to clear queue: ${response.status}`);
      }
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error clearing queue:', error);
      setError('Failed to clear queue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
          Queue Monitor
        </h1>
        <div className="mt-2 sm:mt-0">
          <div className="flex items-center space-x-2">
            <div 
              className="px-2 py-1 rounded-md text-sm"
              style={{ 
                backgroundColor: `${currentTheme.colors.bgTertiary}60`,
                color: currentTheme.colors.textSecondary
              }}
            >
              Status:
              <span 
                className="ml-1 font-medium"
                style={{ color: error ? currentTheme.colors.error : currentTheme.colors.success }}
              >
                {error ? 'Error' : 'Active'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-md" style={{ backgroundColor: `${currentTheme.colors.error}20`, color: currentTheme.colors.error }}>
          {error}
        </div>
      )}

      {/* Queue Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-medium mb-1" style={{ color: currentTheme.colors.textSecondary }}>
              Waiting Requests
            </h3>
            <p className="text-2xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
              {queueStats.totalWaiting}
            </p>
          </div>
          <div 
            className="mt-4 h-1 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: currentTheme.colors.bgTertiary }}
          >
            <div 
              className="h-full rounded-full"
              style={{ 
                width: `${Math.min(100, (queueStats.totalWaiting / (queueStats.totalWaiting + queueStats.totalProcessing + 10)) * 100)}%`,
                backgroundColor: currentTheme.colors.accentPrimary
              }}
            />
          </div>
        </Card>
        
        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-medium mb-1" style={{ color: currentTheme.colors.textSecondary }}>
              Processing
            </h3>
            <p className="text-2xl font-bold" style={{ color: currentTheme.colors.accentSecondary }}>
              {queueStats.totalProcessing}
            </p>
          </div>
          <div 
            className="mt-4 h-1 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: currentTheme.colors.bgTertiary }}
          >
            <div 
              className="h-full rounded-full"
              style={{ 
                width: queueStats.totalProcessing > 0 ? '50%' : '0%',
                backgroundColor: currentTheme.colors.accentSecondary
              }}
            />
          </div>
        </Card>
        
        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-medium mb-1" style={{ color: currentTheme.colors.textSecondary }}>
              Avg. Wait Time
            </h3>
            <p className="text-2xl font-bold" style={{ color: currentTheme.colors.accentTertiary }}>
              {formatTime(queueStats.averageWaitTime)}
            </p>
          </div>
          <div 
            className="mt-4 h-1 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: currentTheme.colors.bgTertiary }}
          >
            <div 
              className="h-full rounded-full"
              style={{ 
                width: `${Math.min(100, (queueStats.averageWaitTime / 300) * 100)}%`,
                backgroundColor: currentTheme.colors.accentTertiary
              }}
            />
          </div>
        </Card>
        
        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-medium mb-1" style={{ color: currentTheme.colors.textSecondary }}>
              Requests Per Hour
            </h3>
            <p className="text-2xl font-bold" style={{ color: currentTheme.colors.success }}>
              {queueStats.requestsPerHour}
            </p>
          </div>
          <div 
            className="mt-4 h-1 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: currentTheme.colors.bgTertiary }}
          >
            <div 
              className="h-full rounded-full"
              style={{ 
                width: `${Math.min(100, (queueStats.requestsPerHour / 100) * 100)}%`,
                backgroundColor: currentTheme.colors.success
              }}
            />
          </div>
        </Card>
      </div>

      {/* Queue Controls */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Button 
          onClick={processNextItem}
          disabled={isLoading || queueStats.totalWaiting === 0}
        >
          Process Next Request
        </Button>
        
        <Button 
          variant="danger"
          onClick={clearQueue}
          disabled={isLoading || queueStats.totalWaiting === 0}
        >
          Clear Queue
        </Button>
        
        <div className="flex rounded-md overflow-hidden ml-auto">
          <Button
            onClick={() => setSelectedPriority(null)}
            variant={selectedPriority === null ? 'primary' : 'outline'}
          >
            All
          </Button>
          {[1, 2, 3].map(priority => (
            <Button
              key={priority}
              onClick={() => setSelectedPriority(priority)}
              variant={selectedPriority === priority ? 'primary' : 'outline'}
              style={{
                backgroundColor: selectedPriority === priority ? 
                  (priorityLabels[priority as keyof typeof priorityLabels].color + '40') : 'transparent',
                borderColor: priorityLabels[priority as keyof typeof priorityLabels].color
              }}
            >
              P{priority}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="text-center py-4" style={{ color: currentTheme.colors.textSecondary }}>
          Loading queue data...
        </div>
      )}

      {/* Queue Items Table */}
      <Card>
        <div className="flex border-b mb-4" style={{ borderColor: currentTheme.colors.borderColor }}>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'current' ? 'border-b-2' : ''}`}
            style={{
              borderColor: activeTab === 'current' ? currentTheme.colors.accentPrimary : 'transparent',
              color: activeTab === 'current' ? currentTheme.colors.accentPrimary : currentTheme.colors.textSecondary
            }}
            onClick={() => setActiveTab('current')}
          >
            Current Queue
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'history' ? 'border-b-2' : ''}`}
            style={{
              borderColor: activeTab === 'history' ? currentTheme.colors.accentPrimary : 'transparent',
              color: activeTab === 'history' ? currentTheme.colors.accentPrimary : currentTheme.colors.textSecondary
            }}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}` }}>
                <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>ID</th>
                <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Priority</th>
                <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Source</th>
                <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Timestamp</th>
                <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Status</th>
                <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Age</th>
                <th className="text-left py-2 px-4" style={{ color: currentTheme.colors.textSecondary }}>Prompt</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr style={{ borderBottom: `1px solid ${currentTheme.colors.borderColor}` }}>
                  <td colSpan={7} className="py-4 text-center" style={{ color: currentTheme.colors.textMuted }}>
                    No {activeTab === 'current' ? 'active requests' : 'history'} found
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr 
                    key={item.id} 
                    style={{ 
                      borderBottom: `1px solid ${currentTheme.colors.borderColor}`,
                      backgroundColor: item.status === 'processing' ? `${currentTheme.colors.accentPrimary}10` : 'transparent'
                    }}
                  >
                    <td className="py-3 px-4 font-mono text-sm">{item.id}</td>
                    <td className="py-3 px-4">
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: `${priorityLabels[item.priority as keyof typeof priorityLabels].color}20`,
                          color: priorityLabels[item.priority as keyof typeof priorityLabels].color
                        }}
                      >
                        P{item.priority} - {priorityLabels[item.priority as keyof typeof priorityLabels].name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>{item.source}</div>
                      {item.apiKey && (
                        <div className="text-xs truncate max-w-[150px]" style={{ color: currentTheme.colors.textMuted }}>
                          {item.apiKey}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4">
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: item.status === 'waiting' ? `${currentTheme.colors.warning}20` :
                                        item.status === 'processing' ? `${currentTheme.colors.accentPrimary}20` :
                                        item.status === 'completed' ? `${currentTheme.colors.success}20` :
                                        `${currentTheme.colors.error}20`,
                          color: item.status === 'waiting' ? currentTheme.colors.warning :
                                item.status === 'processing' ? currentTheme.colors.accentPrimary :
                                item.status === 'completed' ? currentTheme.colors.success :
                                currentTheme.colors.error
                        }}
                      >
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                      {item.retries > 0 && (
                        <div className="text-xs mt-1" style={{ color: currentTheme.colors.textMuted }}>
                          Retries: {item.retries}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{formatTime(item.age)}</td>
                    <td className="py-3 px-4">
                      <div className="truncate max-w-[200px]">
                        {item.prompt}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </Layout>
  );
};

export default QueueMonitor;