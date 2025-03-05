import React from 'react';
import Card from '../../components/ui/Card';
import CircularProgress from './CircularProgress';
import ProgressBar from './ProgressBar';

interface ResourceCardProps {
  title: string;
  value: number;
  label: string;
  accentColor: string;
  textSecondaryColor: string;
  borderColor: string;
  formatLabel?: (value: number) => string;
  additionalInfo?: string;
}

const ResourceCard: React.FC<ResourceCardProps> = ({
  title,
  value,
  label,
  accentColor,
  textSecondaryColor,
  borderColor,
  formatLabel,
  additionalInfo
}) => {
  // Get default color function
  const getColorByValue = (value: number) => {
    if (value < 70) return '#4ade80'; // green
    if (value < 90) return '#facc15'; // yellow
    return '#ef4444'; // red
  };

  // Format value for display
  const displayValue = formatLabel ? formatLabel(value) : `${value.toFixed(1)}%`;
  const valueColor = getColorByValue(value);

  return (
    <Card title={title} hoverEffect>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-3xl font-bold" style={{ color: accentColor }}>
              {displayValue}
            </div>
            <div className="text-sm mt-1" style={{ color: textSecondaryColor }}>
              {label}
            </div>
          </div>
          
          <CircularProgress 
            value={value} 
            color={accentColor}
            backgroundColor={borderColor} 
          />
        </div>
        
        <div className="mt-4 pt-4 border-t" style={{ borderColor: `${borderColor}40` }}>
          <ProgressBar 
            value={value}
            label={additionalInfo}
            getBarColor={getColorByValue}
            backgroundColor={`${borderColor}60`}
          />
        </div>
      </div>
    </Card>
  );
};

export default ResourceCard;