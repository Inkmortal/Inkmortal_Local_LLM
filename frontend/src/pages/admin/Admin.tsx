import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

// Import types
import { SystemStats, DashboardCard, Activity } from '../../types/AdminTypes';

// Import services
import {
  fetchSystemStats,
  fetchRegistrationTokens,
  fetchApiKeys,
  fetchIPWhitelist,
  fetchQueueStats
} from '../../services/admin';

// Import components
import DashboardCards from '../../components/admin/DashboardCards';
import SystemStatsPanel from '../../components/admin/SystemStatsPanel';
import ActivityFeed from '../../components/admin/ActivityFeed';

const AdminDashboard: React.FC = () => {
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardCards, setDashboardCards] = useState<DashboardCard[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  
  // Icons for dashboard cards
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
        
        // Fetch all required data for dashboard
        const queueStatsResponse = await fetchQueueStats();
        const statsResponse = await fetchSystemStats();
        const tokensResponse = await fetchRegistrationTokens();
        const apiKeysResponse = await fetchApiKeys();
        const ipWhitelistResponse = await fetchIPWhitelist();
        
        // Create dashboard cards
        const cards: DashboardCard[] = [
          {
            id: 'ip-whitelist',
            title: 'IP Whitelist',
            count: ipWhitelistResponse.length,
            active: ipWhitelistResponse.filter(ip => ip.is_active).length,
            path: '/admin/ip-whitelist'
          },
          {
            id: 'tokens',
            title: 'Registration Tokens',
            count: tokensResponse.length,
            active: tokensResponse.filter(token => \!token.used).length,
            path: '/admin/tokens'
          },
          {
            id: 'api-keys',
            title: 'API Keys',
            count: apiKeysResponse.length,
            active: apiKeysResponse.filter(key => key.is_active).length,
            path: '/admin/api-keys'
          },
          {
            id: 'queue',
            title: 'Queue Status',
            count: queueStatsResponse ? (queueStatsResponse.total_waiting + queueStatsResponse.total_processing) : 0,
            processing: queueStatsResponse ? queueStatsResponse.total_processing : 0,
            path: '/admin/queue'
          }
        ];
        
        // Create sample activity data
        // In a real app, this would come from an API call
        const activities: Activity[] = [
          {
            id: '1',
            user: 'admin',
            action: 'created',
            target: 'API Key',
            time: '5 minutes ago',
            type: 'api-key'
          },
          {
            id: '2',
            user: 'system',
            action: 'added',
            target: 'IP Address 192.168.1.100',
            time: '10 minutes ago',
            type: 'ip'
          },
          {
            id: '3',
            user: 'admin',
            action: 'generated',
            target: 'Registration Token',
            time: '1 hour ago',
            type: 'token'
          },
          {
            id: '4',
            user: 'system',
            action: 'processed',
            target: 'Queue Item',
            time: '2 hours ago',
            type: 'queue'
          },
          {
            id: '5',
            user: 'admin',
            action: 'revoked',
            target: 'API Key',
            time: '3 hours ago',
            type: 'api-key'
          }
        ];
        
        // Update state with fetched data
        setDashboardCards(cards);
        setSystemStats(statsResponse || {
          cpu: 35,
          memory: 60,
          storage: 45,
          uptime: '5 days, 6 hours',
          ollama: {
            status: 'Running',
            model: 'llama3.1-70b',
            version: '0.1.18'
          },
          queue_connected: true
        });
        setActivities(activities);
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

  // Extract theme colors for components
  const accentColors = {
    primary: currentTheme.colors.accentPrimary,
    secondary: currentTheme.colors.accentSecondary,
    tertiary: currentTheme.colors.accentTertiary,
    success: currentTheme.colors.success,
    error: currentTheme.colors.error,
    textPrimary: currentTheme.colors.textPrimary,
    textSecondary: currentTheme.colors.textSecondary,
    textMuted: currentTheme.colors.textMuted,
    bgPrimary: currentTheme.colors.bgPrimary,
    bgSecondary: currentTheme.colors.bgSecondary,
    bgTertiary: currentTheme.colors.bgTertiary,
    borderColor: currentTheme.colors.borderColor
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

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

      {/* Error message */}
      {error && (
        <div 
          className="mb-6 p-3 rounded-md"
          style={{
            backgroundColor: `${currentTheme.colors.error}20`,
            color: currentTheme.colors.error,
          }}
        >
          {error}
        </div>
      )}

      {/* Dashboard Cards */}
      <DashboardCards 
        cards={dashboardCards} 
        accentColors={{
          primary: accentColors.primary,
          secondary: accentColors.secondary,
          tertiary: accentColors.tertiary,
          success: accentColors.success,
          textMuted: accentColors.textMuted
        }}
        cardIcons={cardIcons}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Stats Panel */}
        {systemStats && (
          <SystemStatsPanel
            stats={systemStats}
            accentColors={accentColors}
          />
        )}

        {/* Activity Feed */}
        <ActivityFeed
          activities={activities}
          accentColors={accentColors}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
