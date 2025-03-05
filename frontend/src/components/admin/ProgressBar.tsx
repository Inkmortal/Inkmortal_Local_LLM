import React from 'react';

interface ProgressBarProps {
  value: number;
  label?: string;
  height?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  getLabelColor?: (value: number) => string;
  getBarColor?: (value: number) => string;
  backgroundColor?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  height = 'sm',
  showLabel = true,
  getLabelColor,
  getBarColor,
  backgroundColor = '#2a2a2a50'
}) => {
  // Height mappings
  const heightMap = {
    xs: 'h-1.5',
    sm: 'h-2.5',
    md: 'h-4'
  };

  // Ensure value is between 0-100
  const safeValue = Math.min(100, Math.max(0, value));
  
  // Default color function if not provided
  const defaultGetBarColor = (value: number) => {
    if (value < 70) return '#4ade80'; // green
    if (value < 90) return '#facc15'; // yellow
    return '#ef4444'; // red
  };

  // Get the appropriate color based on value
  const barColor = getBarColor ? getBarColor(safeValue) : defaultGetBarColor(safeValue);
  const textColor = getLabelColor ? getLabelColor(safeValue) : '#9ca3af'; // gray-400

  return (
    <div className="w-full">
      <div 
        className={`${heightMap[height]} w-full rounded-full overflow-hidden mb-1`}
        style={{ backgroundColor }}
      >
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${safeValue}%`,
            backgroundColor: barColor
          }}
        />
      </div>
      {showLabel && label && (
        <div className="text-xs" style={{ color: textColor }}>
          {label}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;