import React from 'react';

interface CircularProgressProps {
  value: number;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  backgroundColor?: string;
  showLabel?: boolean;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  color,
  size = 'md',
  backgroundColor = '#2a2a2a',
  showLabel = true
}) => {
  // Size mappings
  const sizeMap = {
    sm: { outer: 'w-12 h-12', inner: 'w-8 h-8', fontSize: 'text-xs' },
    md: { outer: 'w-16 h-16', inner: 'w-12 h-12', fontSize: 'text-sm' },
    lg: { outer: 'w-24 h-24', inner: 'w-18 h-18', fontSize: 'text-base' }
  };

  // Ensure value is between 0-100
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div 
      className={`${sizeMap[size].outer} rounded-full flex items-center justify-center`}
      style={{ 
        background: `conic-gradient(${color} ${safeValue}%, ${backgroundColor}50 0)`,
        boxShadow: `0 0 10px ${color}30`
      }}
    >
      <div 
        className={`${sizeMap[size].inner} rounded-full flex items-center justify-center font-bold ${sizeMap[size].fontSize}`}
        style={{ 
          backgroundColor,
          color
        }}
      >
        {showLabel && `${Math.round(safeValue)}%`}
      </div>
    </div>
  );
};

export default CircularProgress;