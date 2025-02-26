import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/admin');

  // Update current path based on window location
  useEffect(() => {
    const path = window.location.pathname;
    setCurrentPath(path);
  }, []);

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    
    // In a real application, this would use router navigation
    // history.push(path);
  };

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: currentTheme.colors.bgPrimary,
        color: currentTheme.colors.textPrimary
      }}
    >
      <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <div className="flex flex-1 pt-16">
        <Sidebar 
          isOpen={isSidebarOpen} 
          currentPath={currentPath}
          onNavigate={handleNavigate}
        />
        
        <main 
          className="flex-1 p-6 lg:ml-64 transition-all duration-300"
          style={{ color: currentTheme.colors.textPrimary }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;