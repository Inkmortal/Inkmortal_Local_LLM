import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

// Define the navigation items
const navItems = [
  { 
    id: 'dashboard', 
    name: 'Dashboard', 
    path: '/admin',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ) 
  },
  {
    id: 'ip-whitelist',
    name: 'IP Whitelist',
    path: '/admin/ip-whitelist',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    )
  },
  {
    id: 'tokens',
    name: 'Registration Tokens',
    path: '/admin/tokens',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    )
  },
  {
    id: 'api-keys',
    name: 'API Keys',
    path: '/admin/api-keys',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    id: 'queue',
    name: 'Queue Monitor',
    path: '/admin/queue',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  },
  {
    id: 'stats',
    name: 'System Stats',
    path: '/admin/stats',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    id: 'themes',
    name: 'Theme Customizer',
    path: '/admin/themes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    )
  }
];

interface SidebarProps {
  isOpen: boolean;
  currentPath: string;
  onNavigate: (path: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, currentPath, onNavigate }) => {
  const { currentTheme } = useTheme();
  const { logout, username } = useAuth();
  
  // Handle navigation
  const handleNavigate = (path: string) => {
    // Use the global navigation function
    window.navigateTo(path);
    
    // Call the provided onNavigate for sidebar state management
    onNavigate(path);
  };
  
  // Get contrasting text color for active items
  const getContrastColor = (bgColor: string) => {
    // Simple function to determine if text should be light or dark based on background
    const isHex = bgColor.startsWith('#');
    if (!isHex) return 'white';
    
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    return brightness > 155 ? '#000000' : '#FFFFFF';
  };
  
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-20 backdrop-blur-sm"
          onClick={() => onNavigate(currentPath)} // Close sidebar on backdrop click
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 transition-transform duration-300 ease-in-out z-30 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: `linear-gradient(to bottom, ${currentTheme.colors.bgSecondary}, ${currentTheme.colors.bgPrimary}F0)`,
          borderRight: `1px solid ${currentTheme.colors.borderColor}40`,
          boxShadow: `4px 0 20px rgba(0, 0, 0, 0.05)`
        }}
      >
        <nav className="h-full flex flex-col overflow-y-auto admin-scrollbar py-4">
          <div className="px-4 mb-6">
            <div 
              className="h-1 w-20 rounded-full mx-auto"
              style={{ 
                background: `linear-gradient(to right, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
                boxShadow: `0 2px 8px ${currentTheme.colors.accentPrimary}40` 
              }}
            />
          </div>
          
          <ul className="space-y-1 px-3 flex-1">
            {navItems.map((item) => {
              const isActive = currentPath === item.path;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigate(item.path)}
                    className={`flex items-center w-full px-3 py-2.5 rounded-lg transition-all ${
                      isActive ? 'font-medium' : 'hover:bg-opacity-10'
                    }`}
                    style={{ 
                      background: isActive 
                        ? `linear-gradient(to right, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary}DD)` 
                        : 'transparent',
                      color: isActive 
                        ? '#FFFFFF' 
                        : currentTheme.colors.textPrimary,
                      boxShadow: isActive 
                        ? `0 4px 12px ${currentTheme.colors.accentPrimary}40` 
                        : 'none',
                      borderLeft: !isActive 
                        ? `3px solid transparent` 
                        : `3px solid ${currentTheme.colors.accentPrimary}`,
                      transform: isActive ? 'translateX(4px)' : 'none',
                    }}
                  >
                    <span className="mr-3">{item.icon}</span>
                    <span>{item.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          
          <div className="px-4 mt-4">
            {/* User info */}
            {username && (
              <div 
                className="p-3 rounded-lg mb-3"
                style={{ 
                  background: `linear-gradient(135deg, ${currentTheme.colors.bgTertiary}80, ${currentTheme.colors.bgTertiary}40)`,
                  boxShadow: `0 2px 8px rgba(0, 0, 0, 0.05)`,
                  backdropFilter: 'blur(3px)'
                }}
              >
                <div className="flex items-center">
                  <div 
                    className="w-9 h-9 rounded-full mr-3 flex items-center justify-center"
                    style={{ 
                      background: `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
                      boxShadow: `0 2px 8px ${currentTheme.colors.accentPrimary}40` 
                    }}
                  >
                    <span style={{ color: getContrastColor(currentTheme.colors.accentPrimary) }}>
                      {username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: currentTheme.colors.textPrimary }}>
                      {username}
                    </div>
                    <div className="text-xs" style={{ color: currentTheme.colors.textMuted }}>
                      Administrator
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* System status */}
            <div 
              className="p-3 rounded-lg mb-3" 
              style={{ 
                background: `linear-gradient(to bottom, ${currentTheme.colors.bgSecondary}70, ${currentTheme.colors.bgTertiary}90)`,
                boxShadow: `0 2px 8px rgba(0, 0, 0, 0.05)`,
                backdropFilter: 'blur(3px)'
              }}
            >
              <div className="flex items-center mb-2">
                <div 
                  className="w-2 h-2 rounded-full mr-2 relative"
                  style={{ 
                    backgroundColor: currentTheme.colors.success,
                    boxShadow: `0 0 6px ${currentTheme.colors.success}`
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-75"
                    style={{ backgroundColor: currentTheme.colors.success }}
                  />
                </div>
                <span className="text-sm font-medium" style={{ color: currentTheme.colors.textSecondary }}>
                  System Status: Online
                </span>
              </div>
              <div className="flex items-center">
                <div 
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ 
                    backgroundColor: currentTheme.colors.accentTertiary,
                    boxShadow: `0 0 6px ${currentTheme.colors.accentTertiary}`
                  }}
                />
                <span className="text-sm font-medium" style={{ color: currentTheme.colors.textSecondary }}>
                  Queue: Active
                </span>
              </div>
            </div>
            
            {/* Logout button */}
            {username && (
              <button
                onClick={logout}
                className="mt-1 w-full py-2 text-center rounded-lg transition-all hover:scale-102"
                style={{ 
                  background: `linear-gradient(to right, ${currentTheme.colors.error}30, ${currentTheme.colors.error}20)`,
                  color: currentTheme.colors.error,
                  boxShadow: `0 2px 8px ${currentTheme.colors.error}15`,
                  border: `1px solid ${currentTheme.colors.error}30`
                }}
              >
                <div className="flex items-center justify-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </div>
              </button>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;