/**
 * Queue-related API services for the admin dashboard
 */

import { fetchApi } from '../../config/api';
import { QueueStats, QueueItem, HistoryItem } from '../../types/AdminTypes';
import { API_PATHS } from './ApiPaths';

/**
 * Fetch queue statistics
 */
export const fetchQueueStats = async (): Promise<QueueStats | null> => {
  try {
    const response = await fetchApi<QueueStats>(API_PATHS.ADMIN.QUEUE_STATS);
    
    if (!response.success) {
      throw new Error(`Failed to fetch queue stats: ${response.error || response.status}`);
    }
    
    // Ensure consistent default values
    const stats = response.data || {
      total_waiting: 0,
      total_processing: 0,
      total_completed: 0,
      total_error: 0,
      requests_per_hour: 0,
      average_wait_time: 0,
      average_processing_time: 0,
      queue_by_priority: {}
    };
    
    // Handle missing fields with defaults
    return {
      total_waiting: stats.total_waiting || 0,
      total_processing: stats.total_processing || 0,
      total_completed: stats.total_completed || 0,
      total_error: stats.total_error || 0,
      requests_per_hour: stats.requests_per_hour || 0,
      average_wait_time: stats.average_wait_time || 0,
      average_processing_time: stats.average_processing_time || 0,
      queue_by_priority: stats.queue_by_priority || {},
      queue_connected: true, // Default to connected
      worker_count: stats.worker_count || 0,
      // Map backend names to frontend properties
      avg_wait_time: stats.average_wait_time || 0,
      avg_process_time: stats.average_processing_time || 0
    };
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    return {
      total_waiting: 0,
      total_processing: 0,
      total_completed: 0,
      total_error: 0,
      requests_per_hour: 0,
      average_wait_time: 0,
      average_processing_time: 0,
      queue_by_priority: {},
      queue_connected: true,
      worker_count: 0,
      avg_wait_time: 0,
      avg_process_time: 0
    };
  }
};

/**
 * Fetch queue items
 */
export const fetchQueueItems = async (priority?: number): Promise<QueueItem[]> => {
  try {
    const priorityParam = priority ? `?priority=${priority}` : '';
    const response = await fetchApi<QueueItem[]>(`${API_PATHS.ADMIN.QUEUE_ITEMS}${priorityParam}`);
    
    if (!response.success) {
      throw new Error(`Failed to fetch queue items: ${response.error || response.status}`);
    }
    
    return response.data || [];
  } catch (error) {
    console.error('Error fetching queue items:', error);
    return [];
  }
};

/**
 * Fetch queue history
 */
export const fetchQueueHistory = async (priority?: number): Promise<HistoryItem[]> => {
  try {
    const priorityParam = priority ? `?priority=${priority}` : '';
    const response = await fetchApi<HistoryItem[]>(`${API_PATHS.ADMIN.QUEUE_HISTORY}${priorityParam}`);
    
    if (!response.success) {
      throw new Error(`Failed to fetch queue history: ${response.error || response.status}`);
    }
    
    return response.data || [];
  } catch (error) {
    console.error('Error fetching queue history:', error);
    return [];
  }
};

// Alias for backward compatibility
export const fetchHistoryItems = fetchQueueHistory;