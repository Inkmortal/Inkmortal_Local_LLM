import React, { useState, useEffect } from 'react';

interface TimeAgoProps {
  date: Date | string | number;
  refreshInterval?: number; // in milliseconds
  color?: string;
  textSize?: 'xs' | 'sm' | 'base';
  showPrefix?: boolean;
  showTooltip?: boolean;
}

const TimeAgo: React.FC<TimeAgoProps> = ({
  date,
  refreshInterval = 60000, // Default: update every minute
  color,
  textSize = 'sm',
  showPrefix = true,
  showTooltip = true
}) => {
  const [timeAgo, setTimeAgo] = useState<string>('');
  const [fullDate, setFullDate] = useState<string>('');
  
  // Format options for the full date
  const dateFormatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  
  // Parse the date to a Date object
  const getDateObject = (): Date => {
    if (date instanceof Date) return date;
    if (typeof date === 'number') return new Date(date);
    if (typeof date === 'string') {
      // Try to parse the string date
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) return parsedDate;
    }
    return new Date(); // Fallback to current date if invalid
  };
  
  // Calculate time ago string
  const calculateTimeAgo = () => {
    const dateObj = getDateObject();
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    
    // Format the full date for tooltip
    setFullDate(dateObj.toLocaleString(undefined, dateFormatOptions));
    
    // Calculate relative time
    if (diffInSeconds < 60) {
      setTimeAgo(`${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''}`);
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      setTimeAgo(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      setTimeAgo(`${hours} hour${hours !== 1 ? 's' : ''}`);
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      setTimeAgo(`${days} day${days !== 1 ? 's' : ''}`);
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      setTimeAgo(`${months} month${months !== 1 ? 's' : ''}`);
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      setTimeAgo(`${years} year${years !== 1 ? 's' : ''}`);
    }
  };
  
  // Update the time ago at the specified interval
  useEffect(() => {
    calculateTimeAgo();
    
    const intervalId = setInterval(() => {
      calculateTimeAgo();
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [date, refreshInterval]);
  
  // Text size classes
  const sizeClass = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base'
  }[textSize];
  
  return (
    <span 
      className={`${sizeClass} whitespace-nowrap`}
      style={{ color }}
      title={showTooltip ? fullDate : undefined}
    >
      {showPrefix ? 'Updated ' : ''}{timeAgo} ago
    </span>
  );
};

export default TimeAgo;