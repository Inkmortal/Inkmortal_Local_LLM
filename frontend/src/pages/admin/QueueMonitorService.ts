import { QueueItem, HistoryItem, QueueStats } from '../../types/AdminTypes';

// Format date/time consistently for queue items
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

// Truncate text with ellipsis
export const truncateText = (text: string | null | undefined, maxLength: number = 50): string => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

// Get default queue status stats
export const getDefaultQueueStats = (): QueueStats => ({
  total_waiting: 0,
  total_processing: 0,
  total_completed: 0,
  total_error: 0,
  queue_connected: true,
  worker_count: 0,
  avg_wait_time: 0,
  avg_process_time: 0
});

// Get a pretty name for a queue worker status
export const getWorkerStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    'idle': 'Idle',
    'busy': 'Busy',
    'offline': 'Offline',
    'error': 'Error',
    'starting': 'Starting',
    'stopping': 'Stopping'
  };
  
  return statusMap[status.toLowerCase()] || status;
};

// Calculate estimated completion time based on queue stats
export const calculateEstimatedCompletion = (
  position: number, 
  avgProcessTime: number, 
  workerCount: number
): string => {
  if (!avgProcessTime || !workerCount || !position) {
    return 'Unknown';
  }
  
  // Estimate time in minutes based on position, process time, and workers
  const estimatedMinutes = (position / workerCount) * (avgProcessTime / 60);
  
  if (estimatedMinutes < 1) {
    return 'Less than a minute';
  } else if (estimatedMinutes < 60) {
    const minutes = Math.round(estimatedMinutes);
    return `~${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(estimatedMinutes / 60);
    const minutes = Math.round(estimatedMinutes % 60);
    return `~${hours} hour${hours !== 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} minute${minutes !== 1 ? 's' : ''}` : ''}`;
  }
};

// Process an item to add derived fields like completion time estimates
export const processQueueItem = (
  item: QueueItem, 
  index: number, 
  stats: QueueStats
): QueueItem & { estimatedCompletion?: string } => {
  // Deep copy item to avoid mutations
  const processedItem = { ...item };
  
  // Add estimated completion time for waiting items based on queue stats
  if (item.status === 'waiting') {
    const position = index + 1; // Position in queue (1-based)
    processedItem.estimatedCompletion = calculateEstimatedCompletion(
      position,
      stats.avg_process_time || 0,
      stats.worker_count || 1
    );
  }
  
  return processedItem;
};