import React from 'react';

interface StatusCardProps {
  title: string;
  value: string;
  icon?: React.ReactNode;
  accentColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderStyle?: 'none' | 'left' | 'all';
  textSecondaryColor: string;
  textPrimaryColor: string;
}

const StatusCard: React.FC<StatusCardProps> = ({
  title,
  value,
  icon,
  accentColor,
  backgroundColor = '#2a2a2a30',
  borderColor,
  borderStyle = 'none',
  textSecondaryColor,
  textPrimaryColor
}) => {
  // Determine border style
  const getBorderStyle = () => {
    switch (borderStyle) {
      case 'left':
        return { borderLeft: `3px solid ${borderColor || accentColor}` };
      case 'all':
        return { border: `1px solid ${borderColor || accentColor}` };
      default:
        return {};
    }
  };

  return (
    <div 
      className="overflow-hidden rounded-lg bg-opacity-10 p-4" 
      style={{ 
        backgroundColor, 
        ...getBorderStyle()
      }}
    >
      <div className="flex items-start">
        {icon && (
          <div 
            className="mr-3 p-2 rounded-full bg-opacity-20" 
            style={{ backgroundColor: `${accentColor}20` }}
          >
            {icon}
          </div>
        )}
        <div>
          <div className="text-sm font-medium" style={{ color: textSecondaryColor }}>
            {title}
          </div>
          <div className="font-bold mt-1" style={{ color: accentColor || textPrimaryColor }}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusCard;