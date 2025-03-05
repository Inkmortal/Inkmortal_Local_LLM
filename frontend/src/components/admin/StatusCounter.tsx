import React from 'react';

interface StatusCounterProps {
  count: number;
  label: string;
  icon?: React.ReactNode;
  color: string;
  bgColor?: string;
  borderStyle?: 'none' | 'left' | 'all';
  showIndicator?: boolean;
  onClick?: () => void;
  isActive?: boolean;
}

const StatusCounter: React.FC<StatusCounterProps> = ({
  count,
  label,
  icon,
  color,
  bgColor,
  borderStyle = 'none',
  showIndicator = false,
  onClick,
  isActive = false
}) => {
  // Apply border styling based on the borderStyle prop
  const getBorderStyles = () => {
    switch (borderStyle) {
      case 'left':
        return { borderLeft: `3px solid ${color}` };
      case 'all':
        return { border: `1px solid ${color}` };
      default:
        return {};
    }
  };

  return (
    <div 
      className={`rounded-lg p-4 transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-lg' : ''} ${isActive ? 'ring-2' : ''}`}
      style={{ 
        backgroundColor: bgColor || `${color}15`,
        ...getBorderStyles(),
        boxShadow: isActive ? `0 0 0 2px ${color}40` : 'none'
      }}
      onClick={onClick}
    >
      <div className="flex items-center">
        {icon && (
          <div 
            className="flex-shrink-0 w-10 h-10 mr-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center">
            <div className="text-2xl font-bold" style={{ color }}>
              {count}
            </div>
            {showIndicator && count > 0 && (
              <div 
                className="ml-2 w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: color }}
              />
            )}
          </div>
          <div className="text-sm font-medium" style={{ color: `${color}90` }}>
            {label}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusCounter;