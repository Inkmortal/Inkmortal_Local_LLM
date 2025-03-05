import React from 'react';
import Card from '../../components/ui/Card';
import StatusBadge from './StatusBadge';

type HealthStatus = 'good' | 'warning' | 'critical';

interface SystemHealthItem {
  label: string;
  status: HealthStatus;
  value: string;
}

interface HealthCardProps {
  items: SystemHealthItem[];
  systemHealthStatuses: {
    good: { label: string, color: string };
    warning: { label: string, color: string };
    critical: { label: string, color: string };
  };
  textSecondaryColor: string;
}

const HealthCard: React.FC<HealthCardProps> = ({
  items,
  systemHealthStatuses,
  textSecondaryColor
}) => {
  return (
    <Card title="System Health" hoverEffect>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item, index) => (
          <div 
            key={index}
            className="overflow-hidden rounded-lg" 
            style={{ 
              backgroundColor: `${systemHealthStatuses[item.status].color}10`,
              borderLeft: `3px solid ${systemHealthStatuses[item.status].color}`
            }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium" style={{ color: textSecondaryColor }}>
                  {item.label}
                </div>
                <StatusBadge 
                  status={item.status}
                  color={systemHealthStatuses[item.status].color}
                />
              </div>
              <div 
                className="text-xl font-bold" 
                style={{ color: systemHealthStatuses[item.status].color }}
              >
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default HealthCard;