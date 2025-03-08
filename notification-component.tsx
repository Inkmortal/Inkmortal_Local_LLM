/**
 * Toast notification system for displaying user-friendly messages
 * 
 * INSTRUCTIONS:
 * 1. Create a new file at frontend/src/components/ui/Notification.tsx with this content
 * 2. Add the NotificationProvider to your App.tsx
 * 3. Import and use the notification functions from utils/notifications.ts
 */

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Types
type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface NotificationData {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  duration?: number;
}

interface NotificationContextType {
  addNotification: (data: Omit<NotificationData, 'id'>) => void;
  removeNotification: (id: string) => void;
}

// Create context
const NotificationContext = createContext<NotificationContextType>({
  addNotification: () => {},
  removeNotification: () => {},
});

// Use notification hook
export const useNotification = () => useContext(NotificationContext);

// Individual notification component
const NotificationItem: React.FC<{
  notification: NotificationData;
  onClose: (id: string) => void;
}> = ({ notification, onClose }) => {
  useEffect(() => {
    // Auto-close after duration (default: 5000ms)
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, notification.duration || 5000);

    return () => clearTimeout(timer);
  }, [notification, onClose]);

  // Icon and color based on type
  const getTypeStyles = () => {
    switch (notification.type) {
      case 'success':
        return {
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          textColor: 'text-green-800 dark:text-green-300',
          icon: '✓',
          borderColor: 'border-l-4 border-green-500',
        };
      case 'error':
        return {
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          textColor: 'text-red-800 dark:text-red-300',
          icon: '✗',
          borderColor: 'border-l-4 border-red-500',
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          textColor: 'text-yellow-800 dark:text-yellow-300',
          icon: '⚠',
          borderColor: 'border-l-4 border-yellow-500',
        };
      default: // info
        return {
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          textColor: 'text-blue-800 dark:text-blue-300',
          icon: 'ℹ',
          borderColor: 'border-l-4 border-blue-500',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className={`flex items-start p-4 mb-3 rounded shadow-md ${styles.bgColor} ${styles.borderColor} backdrop-blur-sm transition-all duration-300 ease-in-out transform hover:translate-x-1`}
      role="alert"
    >
      <div className={`mr-3 text-lg font-bold ${styles.textColor}`}>
        {styles.icon}
      </div>
      <div className="flex-1">
        {notification.title && (
          <h4 className={`font-semibold ${styles.textColor}`}>{notification.title}</h4>
        )}
        <p className="text-sm text-gray-700 dark:text-gray-300">{notification.message}</p>
      </div>
      <button
        onClick={() => onClose(notification.id)}
        className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
};

// Notification container
const NotificationContainer: React.FC<{
  notifications: NotificationData[];
  onClose: (id: string) => void;
}> = ({ notifications, onClose }) => {
  // Create portal to render outside the main React tree
  return createPortal(
    <div className="fixed top-4 right-4 z-50 max-w-md">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={onClose}
        />
      ))}
    </div>,
    document.body
  );
};

// Provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  // Add notification
  const addNotification = useCallback((data: Omit<NotificationData, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { ...data, id }]);
  }, []);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  // Listen for app:notification events
  useEffect(() => {
    const handleEvent = (event: CustomEvent) => {
      if (event.detail) {
        addNotification(event.detail);
      }
    };

    // Add event listener
    window.addEventListener('app:notification' as any, handleEvent as EventListener);

    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('app:notification' as any, handleEvent as EventListener);
    };
  }, [addNotification]);

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification }}>
      {children}
      <NotificationContainer notifications={notifications} onClose={removeNotification} />
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;