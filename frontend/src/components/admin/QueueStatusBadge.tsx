import React from 'react';

interface QueueStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const QueueStatusBadge: React.FC<QueueStatusBadgeProps> = ({
  status,
  size = 'md'
}) => {
  // Normalize status
  const normalizedStatus = (status || '').toLowerCase();
  
  // Define status mappings
  const getStatusInfo = () => {
    switch (normalizedStatus) {
      case 'waiting':
        return { label: 'Waiting', color: '#3b82f6', bg: '#3b82f620' };
      case 'processing':
        return { label: 'Processing', color: '#facc15', bg: '#facc1520', pulse: true };
      case 'complete':
      case 'completed':
        return { label: 'Completed', color: '#4ade80', bg: '#4ade8020' };
      case 'error':
      case 'failed':
        return { label: 'Failed', color: '#ef4444', bg: '#ef444420' };
      case 'cancelled':
        return { label: 'Cancelled', color: '#71717a', bg: '#71717a20' };
      default:
        return { label: status || 'Unknown', color: '#71717a', bg: '#71717a20' };
    }
  };
  
  const { label, color, bg, pulse } = getStatusInfo();
  
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
      {label}
      {pulse && (
        <span className="ml-1 relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }}></span>
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: color }}></span>
        </span>
      )}
    </span>
  );
};

export default QueueStatusBadge;