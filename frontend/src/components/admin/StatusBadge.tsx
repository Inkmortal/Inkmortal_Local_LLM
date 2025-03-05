import React from 'react';

type StatusType = 'good' | 'warning' | 'critical';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  color: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, color }) => {
  const displayLabel = label || {
    good: 'Good',
    warning: 'Warning',
    critical: 'Critical'
  }[status];

  return (
    <span
      className="px-2 py-1 rounded-md text-xs font-medium"
      style={{
        backgroundColor: `${color}20`,
        color: color
      }}
    >
      {displayLabel}
    </span>
  );
};

export default StatusBadge;