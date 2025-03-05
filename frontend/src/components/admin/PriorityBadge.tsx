import React from 'react';

interface PriorityBadgeProps {
  priority: number | string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showLabel = true,
  size = 'md'
}) => {
  // Convert priority to number if it's a string
  const priorityNum = typeof priority === 'string' ? parseInt(priority, 10) || 0 : priority;
  
  // Define priority levels and their colors
  const getPriorityInfo = (priority: number) => {
    if (priority <= 0) return { label: 'Low', color: '#4ade80', bg: '#4ade8020' };
    if (priority === 1) return { label: 'Normal', color: '#3b82f6', bg: '#3b82f620' };
    if (priority === 2) return { label: 'High', color: '#facc15', bg: '#facc1520' };
    if (priority === 3) return { label: 'Urgent', color: '#f97316', bg: '#f9731620' };
    return { label: 'Critical', color: '#ef4444', bg: '#ef444420' };
  };
  
  const { label, color, bg } = getPriorityInfo(priorityNum);
  
  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5'
  }[size];
  
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClasses}`}
      style={{ backgroundColor: bg, color }}
    >
      {showLabel ? label : `P${priorityNum}`}
    </span>
  );
};

export default PriorityBadge;