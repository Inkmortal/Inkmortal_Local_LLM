import React from 'react';
import Card from '../../components/ui/Card';

interface AutoRefreshToggleProps {
  autoRefresh: boolean;
  refreshInterval: number;
  onToggleAutoRefresh: () => void;
  onChangeInterval: (interval: number) => void;
  textSecondaryColor: string;
  bgTertiaryColor: string;
  textPrimaryColor: string;
  borderColor: string;
}

const AutoRefreshToggle: React.FC<AutoRefreshToggleProps> = ({
  autoRefresh,
  refreshInterval,
  onToggleAutoRefresh,
  onChangeInterval,
  textSecondaryColor,
  bgTertiaryColor,
  textPrimaryColor,
  borderColor
}) => {
  // Handle interval change
  const handleRefreshIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeInterval(parseInt(e.target.value, 10));
  };

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <label 
            htmlFor="auto-refresh" 
            className="flex items-center cursor-pointer"
            style={{ color: textSecondaryColor }}
          >
            <input
              id="auto-refresh"
              type="checkbox"
              checked={autoRefresh}
              onChange={onToggleAutoRefresh}
              className="mr-2"
              aria-label="Enable auto-refresh"
            />
            Auto-refresh
          </label>
          
          {autoRefresh && (
            <select
              value={refreshInterval}
              onChange={handleRefreshIntervalChange}
              className="p-1 rounded-md text-sm"
              style={{
                backgroundColor: bgTertiaryColor,
                color: textPrimaryColor,
                border: `1px solid ${borderColor}`
              }}
              aria-label="Select refresh interval"
            >
              <option value={10000}>Every 10 seconds</option>
              <option value={30000}>Every 30 seconds</option>
              <option value={60000}>Every minute</option>
              <option value={300000}>Every 5 minutes</option>
            </select>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AutoRefreshToggle;