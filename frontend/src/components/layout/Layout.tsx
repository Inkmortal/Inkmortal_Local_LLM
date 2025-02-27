import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentTheme } = useTheme();
  const { isAuthenticated, username } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/admin');

  // Update current path based on window location
  useEffect(() => {
    const path = window.location.pathname;
    setCurrentPath(path);
    
    // Listen for URL changes
    const handleUrlChange = () => {
      setCurrentPath(window.location.pathname);
    };
    
    window.addEventListener('popstate', handleUrlChange);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  // Check authentication status
  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      window.navigateTo('/admin/login');
    }
  }, [isAuthenticated]);

  // Create style for animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(var(--pulse-color), 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(var(--pulse-color), 0); }
        100% { box-shadow: 0 0 0 0 rgba(var(--pulse-color), 0); }
      }
      
      .hover-float {
        transition: transform 0.3s ease;
      }
      
      .hover-float:hover {
        transform: translateY(-5px);
      }
      
      .fade-in {
        animation: fadeIn 0.5s ease forwards;
      }
      
      .slide-in {
        animation: slideIn 0.5s ease forwards;
      }
      
      .admin-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      
      .admin-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .admin-scrollbar::-webkit-scrollbar-thumb {
        background-color: rgba(155, 155, 155, 0.5);
        border-radius: 20px;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: currentTheme.colors.bgPrimary,
        color: currentTheme.colors.textPrimary,
        backgroundImage: `radial-gradient(circle at 10% 10%, ${currentTheme.colors.bgSecondary}20, transparent 800px)`,
      }}
    >
      <Navbar 
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        username={username || ''}
      />
      
      <div className="flex flex-1 pt-16 h-[calc(100vh-4rem)]">
        <Sidebar 
          isOpen={isSidebarOpen} 
          currentPath={currentPath}
          onNavigate={handleNavigate}
        />
        
        <main 
          className="flex-1 p-6 lg:ml-64 transition-all duration-300 overflow-y-auto admin-scrollbar"
          style={{ color: currentTheme.colors.textPrimary }}
        >
          <div className="max-w-7xl mx-auto fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;