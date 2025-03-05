import React from 'react';
import Card from '../ui/Card';
import { Activity } from '../../types/AdminTypes';

interface ActivityFeedProps {
  activities: Activity[];
  accentColors: {
    primary: string;
    secondary: string;
    tertiary: string;
    success: string;
    error: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    bgTertiary: string;
    bgSecondary: string;
    borderColor: string;
  };
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, accentColors }) => {
  return (
    <Card title="Recent Activity" className="lg:col-span-2">
      <div className="space-y-3">
        {activities.map((activity) => {
          // Define highlight color based on activity type
          const highlightColor = 
            activity.type === 'api-key' ? accentColors.secondary :
            activity.type === 'ip' ? accentColors.success :
            activity.type === 'token' ? accentColors.primary :
            accentColors.tertiary;
            
          return (
            <div 
              key={activity.id} 
              className="p-3 rounded-lg transition-all hover:translate-x-1"
              style={{ 
                background: `linear-gradient(to right, ${highlightColor}10, ${accentColors.bgTertiary}30)`,
                boxShadow: `0 2px 8px rgba(0, 0, 0, 0.03)`,
                borderLeft: `2px solid ${highlightColor}40`,
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium flex items-center">
                    <span>{activity.user}</span>
                    <span 
                      className="mx-1.5 text-xs px-1.5 py-0.5 rounded-full" 
                      style={{ 
                        backgroundColor: `${highlightColor}20`,
                        color: highlightColor
                      }}
                    >
                      {activity.action}
                    </span>
                    <span style={{ color: highlightColor }}>
                      {activity.target}
                    </span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: accentColors.textMuted }}>{activity.time}</p>
                </div>
                <div 
                  className="p-2 rounded-full"
                  style={{ 
                    backgroundColor: `${highlightColor}15` 
                  }}
                >
                  {activity.type === 'api-key' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                        style={{ color: highlightColor }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  )}
                  {activity.type === 'ip' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                        style={{ color: highlightColor }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                  {activity.type === 'token' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                        style={{ color: highlightColor }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  )}
                  {activity.type === 'queue' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                        style={{ color: highlightColor }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        <div className="text-center mt-4">
          <button 
            className="inline-flex items-center py-2 px-4 rounded-lg text-sm transition-all hover:scale-102"
            style={{ 
              background: `linear-gradient(to right, ${accentColors.secondary}20, ${accentColors.primary}20)`,
              color: accentColors.primary 
            }}
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
            View All Activity
          </button>
        </div>
      </div>
    </Card>
  );
};

export default ActivityFeed;