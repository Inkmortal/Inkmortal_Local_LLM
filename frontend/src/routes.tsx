import React from 'react';
import { RouteObject, Navigate, Outlet } from 'react-router-dom';
import ROUTES from './routes.constants';

// Layout Components
import Layout from './components/layout/Layout';

// Admin Pages
import AdminDashboard from './pages/admin/Admin';
import IPWhitelist from './pages/admin/IPWhitelist';
import RegistrationTokens from './pages/admin/RegistrationTokens';
import APIKeys from './pages/admin/APIKeys';
import QueueMonitor from './pages/admin/QueueMonitor';
import UserManagement from './pages/admin/UserManagement';
import SystemStats from './pages/admin/SystemStats';
import AdminLogin from './pages/admin/Login';

// Auth Pages
import UserLogin from './pages/auth/Login';
import Register from './pages/auth/Register';
import Unauthorized from './pages/auth/Unauthorized';

// User Pages
import Profile from './pages/user/Profile';
import ChatPage from './pages/chat/ModernChatPage';
import ModernHomePage from './components/HomePage';
import ThemeGallery from './pages/themes/ThemeGallery';

// Auth Components
import { RequireAuth } from './context/AuthContext';

// Define route structure with types
interface AppRoutes {
  mainRoutes: RouteObject[];
}

// Admin layout wrapper
const AdminLayout = () => {
  return (
    <RequireAuth requireAdmin={true}>
      <Layout>
        <Outlet />
      </Layout>
    </RequireAuth>
  );
};

// Main layout with Outlet
const MainLayout = () => (
  <Layout>
    <Outlet />
  </Layout>
);

// Protected User Layout
const ProtectedUserLayout = () => (
  <RequireAuth>
    <Layout>
      <Outlet />
    </Layout>
  </RequireAuth>
);

// Export routes for reuse
export const routes: AppRoutes = {
  mainRoutes: [
    // Public Routes
    {
      path: ROUTES.HOME,
      element: <MainLayout />,
      children: [
        { index: true, element: <ModernHomePage /> },
        { path: 'login', element: <UserLogin /> },
        { path: 'register', element: <Register /> },
        { path: 'unauthorized', element: <Unauthorized /> },
        { path: 'themes', element: <ThemeGallery /> },
      ],
    },
    
    // Protected User Routes
    {
      path: 'user',
      element: <ProtectedUserLayout />,
      children: [
        { path: 'profile', element: <Profile /> },
        { path: 'chat', element: <ChatPage /> },
      ],
    },
    
    // Admin Routes
    {
      path: 'admin',
      element: <AdminLayout />,
      children: [
        { index: true, element: <AdminDashboard /> },
        { path: 'ip-whitelist', element: <IPWhitelist /> },
        { path: 'tokens', element: <RegistrationTokens /> },
        { path: 'api-keys', element: <APIKeys /> },
        { path: 'queue', element: <QueueMonitor /> },
        { path: 'users', element: <UserManagement /> },
        { path: 'stats', element: <SystemStats /> },
      ],
    },
    
    // Admin Login - Public
    { path: 'admin/login', element: <AdminLogin /> },
    
    // Direct chat access - redirect to user/chat for consistency
    { 
      path: 'chat', 
      element: <Navigate to={ROUTES.USER.CHAT} replace /> 
    },
    
    // Catch all - 404
    { path: '*', element: <Navigate to={ROUTES.HOME} replace /> },
  ],
};

// Export routes for App.tsx
export const appRoutes = routes.mainRoutes;