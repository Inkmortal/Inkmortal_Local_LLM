import React, { useState, useEffect } from 'react';
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
    }
  };
  const recentActivities = dashboardData?.recent_activities || [];

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6" style={{ color: currentTheme.colors.accentPrimary }}>
        Admin Dashboard
      </h1>

      {/* Dashboard Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {dashboardCards.map(card => (
          <Card key={card.id} className="flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-md" style={{ backgroundColor: `${currentTheme.colors.accentPrimary}20` }}>
                <div style={{ color: currentTheme.colors.accentPrimary }}>{cardIcons[card.id]}</div>
              </div>
              <div className="text-right">
                <h3 className="font-semibold">{card.title}</h3>
                <p className="text-3xl font-bold" style={{ color: currentTheme.colors.accentSecondary }}>
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
             className="mt-auto py-2 text-center rounded-md w-full"
             style={{
               backgroundColor: `${currentTheme.colors.accentPrimary}20`,
               color: currentTheme.colors.accentPrimary
             }}
             onClick={() => window.navigateTo(card.path)}
           >
             View Details
           </button>
         </Card>
       ))}
     </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Stats */}
        <Card title="System Stats" className="lg:col-span-1">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span>CPU Usage</span>
                <span>{systemStats.cpu}%</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: currentTheme.colors.bgTertiary }}>
                <div 
                  className="h-full rounded-full" 
                  style={{ 
                    width: `${systemStats.cpu}%`,
                    backgroundColor: currentTheme.colors.accentPrimary
                  }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span>Memory Usage</span>
                <span>{systemStats.memory}%</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: currentTheme.colors.bgTertiary }}>
                <div 
                  className="h-full rounded-full" 
                  style={{ 
                    width: `${systemStats.memory}%`,
                    backgroundColor: systemStats.memory > 80 ? currentTheme.colors.error : currentTheme.colors.accentSecondary
                  }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span>Storage</span>
                <span>{systemStats.storage}%</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: currentTheme.colors.bgTertiary }}>
                <div 
                  className="h-full rounded-full" 
                  style={{ 
                    width: `${systemStats.storage}%`,
                    backgroundColor: currentTheme.colors.accentTertiary
                  }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>Uptime</p>
                <p className="font-medium">{systemStats.uptime}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>Ollama Status</p>
                <p className="font-medium" style={{ color: currentTheme.colors.success }}>{systemStats.ollama.status}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>Model</p>
                <p className="font-medium">{systemStats.ollama.model}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>Version</p>
                <p className="font-medium">{systemStats.ollama.version}</p>
              </div>
            </div>

            <button 
              className="mt-4 py-2 text-center rounded-md w-full"
              style={{ 
                backgroundColor: `${currentTheme.colors.accentPrimary}20`,
                color: currentTheme.colors.accentPrimary
              }}
              onClick={() => window.location.href = '/admin/stats'}
            >
              Detailed Stats
            </button>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" className="lg:col-span-2">
          <div className="space-y-3">
            {recentActivities.map(activity => (
              <div 
                key={activity.id} 
                className="p-3 rounded-md"
                style={{ backgroundColor: `${currentTheme.colors.bgTertiary}40` }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      <span>{activity.user}</span>
                      <span style={{ color: currentTheme.colors.textMuted }}> {activity.action} </span>
                      <span 
                        style={{ 
                          color: activity.type === 'api-key' ? currentTheme.colors.accentSecondary :
                                 activity.type === 'ip' ? currentTheme.colors.success :
                                 activity.type === 'token' ? currentTheme.colors.accentPrimary :
                                 currentTheme.colors.accentTertiary
                        }}
                      >
                        {activity.target}
                      </span>
                    </p>
                    <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>{activity.time}</p>
                  </div>
                  <div 
                    className="p-2 rounded-full"
                    style={{ 
                      backgroundColor: `${
                        activity.type === 'api-key' ? currentTheme.colors.accentSecondary :
                        activity.type === 'ip' ? currentTheme.colors.success :
                        activity.type === 'token' ? currentTheme.colors.accentPrimary :
                        currentTheme.colors.accentTertiary
                      }20` 
                    }}
                  >
                    {activity.type === 'api-key' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                           style={{ color: currentTheme.colors.accentSecondary }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                    )}
                    {activity.type === 'ip' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                           style={{ color: currentTheme.colors.success }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    )}
                    {activity.type === 'token' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                           style={{ color: currentTheme.colors.accentPrimary }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    )}
                    {activity.type === 'queue' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                           style={{ color: currentTheme.colors.accentTertiary }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminDashboard;