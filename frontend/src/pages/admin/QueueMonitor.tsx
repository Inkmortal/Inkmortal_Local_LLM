import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

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
  
  // Mock data for queue items
  const [queueItems, setQueueItems] = useState<QueueItem[]>([
    {
      id: 'q1001',
      priority: 1,
      source: 'Direct API',
      timestamp: '2025-02-26T13:45:00',
      status: 'processing',
      age: 0,
      retries: 0,
      apiKey: 'API_ab12cd34ef56gh78',
      prompt: 'Explain quantum computing in simple terms'
    },
    {
      id: 'q1002',
      priority: 2,
      source: 'Custom App',
      timestamp: '2025-02-26T13:44:30',
      status: 'waiting',
      age: 30,
      retries: 0,
      apiKey: 'API_ij90kl12mn34op56',
      prompt: 'Write a function to calculate Fibonacci sequence'
    },
    {
      id: 'q1003',
      priority: 3,
      source: 'Web Interface',
      timestamp: '2025-02-26T13:42:10',
      status: 'waiting',
      age: 170,
      retries: 0,
      prompt: 'Help me solve this calculus problem: integrate x^2 * sin(x)'
    },
    {
      id: 'q1004',
      priority: 3,
      source: 'Web Interface',
      timestamp: '2025-02-26T13:40:00',
      status: 'waiting',
      age: 300,
      retries: 0,
      prompt: 'What is the capital of France?'
    },
    {
      id: 'q1005',
      priority: 2,
      source: 'Custom App',
      timestamp: '2025-02-26T13:38:45',
      status: 'waiting',
      age: 375,
      retries: 1,
      apiKey: 'API_qr78st90uv12wx34',
      prompt: 'Generate a tutorial on React hooks'
    }
  ]);
  
  // Mock data for completed items
  const [historyItems, setHistoryItems] = useState<QueueItem[]>([
    {
      id: 'q1000',
      priority: 1,
      source: 'Direct API',
      timestamp: '2025-02-26T13:30:00',
      status: 'completed',
      age: 0,
      retries: 0,
      apiKey: 'API_ab12cd34ef56gh78',
      prompt: 'What are the main features of Python 3.12?'
    },
    {
      id: 'q999',
      priority: 2,
      source: 'Custom App',
      timestamp: '2025-02-26T13:25:00',
      status: 'completed',
      age: 180,
      retries: 0,
      apiKey: 'API_ij90kl12mn34op56',
      prompt: 'Explain the differences between SQL and NoSQL databases'
    },
    {
      id: 'q998',
      priority: 3,
      source: 'Web Interface',
      timestamp: '2025-02-26T13:20:00',
      status: 'error',
      age: 360,
      retries: 2,
      prompt: 'This is a very long prompt that exceeds the maximum token limit...'
    }
  ]);
  
  // Mock data for queue statistics
  const [queueStats, setQueueStats] = useState<QueueStats>({
    totalWaiting: 4,
    totalProcessing: 1,
    totalCompleted: 125,
    totalError: 3,
    requestsPerHour: 42,
    averageWaitTime: 210, // 3.5 minutes
    averageProcessingTime: 45 // 45 seconds
  });

  // Simulated real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update ages of waiting items
      setQueueItems(prevItems => 
        prevItems.map(item => ({
          ...item,
          age: item.status === 'waiting' ? item.age + 5 : item.age
        }))
      );
      
      // Randomly update queue stats
      setQueueStats(prev => ({
        ...prev,
        requestsPerHour: prev.requestsPerHour + (Math.random() > 0.5 ? 1 : 0),
        averageWaitTime: prev.averageWaitTime + (Math.random() > 0.7 ? 5 : 0)
      }));
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

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
  const processNextItem = () => {
    if (queueItems.filter(item => item.status === 'waiting').length === 0) {
      return; // No waiting items
    }
    
    // Find highest priority waiting item
    const sortedItems = [...queueItems].sort((a, b) => {
      // Sort by priority first (lower number = higher priority)
      if (a.priority !== b.priority) return a.priority - b.priority;
      // Then by age (older = higher priority)
      return b.age - a.age;
    });
    
    const nextItem = sortedItems.find(item => item.status === 'waiting');
    if (!nextItem) return;
    
    // Update item status
    setQueueItems(prevItems => 
      prevItems.map(item => 
        item.id === nextItem.id
          ? { ...item, status: 'processing' }
          : item
      )
    );
  };

  // Clear queue
  const clearQueue = () => {
    // In a real application, this would make an API call
    const processingItems = queueItems.filter(item => item.status === 'processing');
    setQueueItems(processingItems);
    
    // Update stats
    setQueueStats(prev => ({
      ...prev,
      totalWaiting: 0
    }));
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
                style={{ color: currentTheme.colors.success }}
              >
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

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
                width: '25%',
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
                width: '10%',
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
                width: '40%',
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
                width: '60%',
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
          disabled={queueItems.filter(item => item.status === 'waiting').length === 0}
        >
          Process Next Request
        </Button>
        
        <Button 
          variant="danger"
          onClick={clearQueue}
          disabled={queueItems.filter(item => item.status === 'waiting').length === 0}
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