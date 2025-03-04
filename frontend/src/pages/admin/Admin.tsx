import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import {
  fetchDashboardData,
  DashboardData,
  DashboardCard,
  SystemStats,
  Activity
} from './AdminDashboardData';

const AdminDashboard: React.FC = () => {
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  // Icons for dashboard cards (not fetched from API)
  const cardIcons: { [key: string]: React.ReactNode } = {
    'ip-whitelist': (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    'tokens': (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
    'api-keys': (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
      </svg>
    ),
    'queue': (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  };

  // Fetch dashboard data on component mount
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const data = await fetchDashboardData();
        setDashboardData(data);
        setError(null);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    
    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(loadDashboardData, 30000);
    
    // Clean up interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);
  
  // Extract data from the fetched dashboard data, or use empty defaults if not loaded yet
  const dashboardCards = dashboardData?.dashboard_cards || [];
  const systemStats = dashboardData?.system_stats || {
    cpu: 0,
    memory: 0,
    storage: 0,
    uptime: 'Loading...',
    ollama: {
      status: 'Unknown',
      model: 'Loading...',
      version: 'Loading...'
    },
    queue_connected: false
  };
  const recentActivities = dashboardData?.recent_activities || [];

  // Get gradient for dashboard cards
  const getCardGradient = (index: number) => {
    const gradients = [
      `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}15, ${currentTheme.colors.accentPrimary}05)`,
      `linear-gradient(135deg, ${currentTheme.colors.accentSecondary}15, ${currentTheme.colors.accentSecondary}05)`,
      `linear-gradient(135deg, ${currentTheme.colors.accentTertiary}15, ${currentTheme.colors.accentTertiary}05)`,
      `linear-gradient(135deg, ${currentTheme.colors.success}15, ${currentTheme.colors.success}05)`
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="mb-8 pb-8">
      <div className="mb-8 pb-4 border-b" style={{ borderColor: `${currentTheme.colors.borderColor}40` }}>
        <h1 className="text-2xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
          Admin Dashboard
        </h1>
        <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
          Monitor and manage your Seadragon LLM system
        </p>
      </div>

      {/* Dashboard Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {dashboardCards.map((card, index) => {
          // Determine accent color based on card ID
          const accentType = 
            card.id === 'ip-whitelist' ? 'primary' :
            card.id === 'tokens' ? 'secondary' :
            card.id === 'api-keys' ? 'tertiary' : 'primary';
          
          const accentColor = 
            accentType === 'primary' ? currentTheme.colors.accentPrimary :
            accentType === 'secondary' ? currentTheme.colors.accentSecondary :
            currentTheme.colors.accentTertiary;
            
          return (
            <Card 
              key={card.id} 
              className="flex flex-col"
              hoverEffect={true}
              accentColor={accentType as any}
            >
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="p-3 rounded-lg transition-all hover:scale-105"
                  style={{ 
                    background: getCardGradient(index),
                    boxShadow: `0 4px 15px ${accentColor}20`
                  }}
                >
                  <div style={{ color: accentColor }}>{cardIcons[card.id]}</div>
                </div>
                <div className="text-right">
                  <h3 className="font-semibold">{card.title}</h3>
                  <p className="text-3xl font-bold" style={{ color: accentColor }}>
                    {card.count}
                  </p>
                  {card.active !== undefined && (
                    <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
                      {card.active} Active
                    </p>
                  )}
                  {card.processing !== undefined && (
                    <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
                      {card.processing} Processing
                    </p>
                  )}
                </div>
              </div>
              <button
                className="mt-auto py-2.5 text-center rounded-lg w-full transition-all hover:scale-102"
                style={{
                  background: `linear-gradient(to right, ${accentColor}20, ${accentColor}30)`,
                  color: accentColor,
                  boxShadow: `0 2px 8px ${accentColor}20`
                }}
                onClick={() => navigate(card.path)}
              >
                View Details
              </button>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Stats */}
        <Card title="System Stats" className="lg:col-span-1">
          <div className="space-y-5">
            <div>
              <div className="flex justify-between mb-2 items-center">
                <span className="font-medium">CPU Usage</span>
                <span className="font-mono font-medium" style={{ color: currentTheme.colors.accentPrimary }}>{systemStats.cpu}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: `${currentTheme.colors.bgTertiary}60` }}>
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${systemStats.cpu}%`,
                    background: `linear-gradient(to right, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
                    boxShadow: systemStats.cpu > 80 ? `0 0 8px ${currentTheme.colors.accentPrimary}` : 'none'
                  }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2 items-center">
                <span className="font-medium">Memory Usage</span>
                <span className="font-mono font-medium" style={{ 
                  color: systemStats.memory > 80 ? currentTheme.colors.error : currentTheme.colors.accentSecondary
                }}>{systemStats.memory}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: `${currentTheme.colors.bgTertiary}60` }}>
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${systemStats.memory}%`,
                    background: systemStats.memory > 80 
                      ? `linear-gradient(to right, ${currentTheme.colors.error}, ${currentTheme.colors.warning})` 
                      : `linear-gradient(to right, ${currentTheme.colors.accentSecondary}, ${currentTheme.colors.accentTertiary})`,
                    boxShadow: systemStats.memory > 80 ? `0 0 8px ${currentTheme.colors.error}` : 'none'
                  }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2 items-center">
                <span className="font-medium">Storage</span>
                <span className="font-mono font-medium" style={{ color: currentTheme.colors.accentTertiary }}>{systemStats.storage}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: `${currentTheme.colors.bgTertiary}60` }}>
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${systemStats.storage}%`,
                    background: `linear-gradient(to right, ${currentTheme.colors.accentTertiary}, ${currentTheme.colors.success})`,
                  }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t" style={{ borderColor: `${currentTheme.colors.borderColor}40` }}>
              <div>
                <p className="text-sm font-medium" style={{ color: currentTheme.colors.textMuted }}>Uptime</p>
                <p className="font-medium mt-1">{systemStats.uptime}</p>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: currentTheme.colors.textMuted }}>Ollama Status</p>
                <div className="flex items-center mt-1">
                  <div 
                    className="w-2 h-2 rounded-full mr-2 relative inline-block"
                    style={{ 
                      backgroundColor: systemStats.ollama.status === 'Running' ? currentTheme.colors.success : currentTheme.colors.error,
                      boxShadow: `0 0 6px ${systemStats.ollama.status === 'Running' ? currentTheme.colors.success : currentTheme.colors.error}`
                    }}
                  >
                    {systemStats.ollama.status === 'Running' && (
                      <div
                        className="absolute inset-0 rounded-full animate-ping opacity-75"
                        style={{ backgroundColor: currentTheme.colors.success }}
                      />
                    )}
                  </div>
                  <span className="font-medium" style={{ 
                    color: systemStats.ollama.status === 'Running' ? currentTheme.colors.success : currentTheme.colors.error
                  }}>
                    {systemStats.ollama.status}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: currentTheme.colors.textMuted }}>Queue Status</p>
                <div className="flex items-center mt-1">
                  <div 
                    className="w-2 h-2 rounded-full mr-2 relative inline-block"
                    style={{ 
                      backgroundColor: systemStats.queue_connected ? currentTheme.colors.success : currentTheme.colors.error,
                      boxShadow: `0 0 6px ${systemStats.queue_connected ? currentTheme.colors.success : currentTheme.colors.error}`
                    }}
                  >
                    {systemStats.queue_connected && (
                      <div
                        className="absolute inset-0 rounded-full animate-ping opacity-75"
                        style={{ backgroundColor: currentTheme.colors.success }}
                      />
                    )}
                  </div>
                  <span className="font-medium" style={{ 
                    color: systemStats.queue_connected ? currentTheme.colors.success : currentTheme.colors.error
                  }}>
                    {systemStats.queue_connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: currentTheme.colors.textMuted }}>Model</p>
                <p className="font-medium mt-1">{systemStats.ollama.model}</p>
              </div>
            </div>

            <button 
              className="mt-4 py-2.5 text-center rounded-lg w-full transition-all hover:scale-102"
              style={{ 
                background: `linear-gradient(to right, ${currentTheme.colors.accentPrimary}20, ${currentTheme.colors.accentSecondary}20)`,
                color: currentTheme.colors.accentPrimary,
                boxShadow: `0 2px 8px ${currentTheme.colors.accentPrimary}20`
              }}
              onClick={() => navigate('/admin/stats')}
            >
              Detailed Stats
            </button>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" className="lg:col-span-2">
          <div className="space-y-3">
            {recentActivities.map((activity, index) => {
              // Define highlight color based on activity type
              const highlightColor = 
                activity.type === 'api-key' ? currentTheme.colors.accentSecondary :
                activity.type === 'ip' ? currentTheme.colors.success :
                activity.type === 'token' ? currentTheme.colors.accentPrimary :
                currentTheme.colors.accentTertiary;
                
              return (
                <div 
                  key={activity.id} 
                  className="p-3 rounded-lg transition-all hover:translate-x-1"
                  style={{ 
                    background: `linear-gradient(to right, ${highlightColor}10, ${currentTheme.colors.bgTertiary}30)`,
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
                      <p className="text-xs mt-1" style={{ color: currentTheme.colors.textMuted }}>{activity.time}</p>
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
                  background: `linear-gradient(to right, ${currentTheme.colors.accentSecondary}20, ${currentTheme.colors.accentPrimary}20)`,
                  color: currentTheme.colors.accentPrimary 
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
      </div>
    </div>
  );
};

export default AdminDashboard;