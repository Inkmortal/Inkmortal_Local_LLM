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
import SystemStats from './pages/admin/SystemStats' ;
import ModelManagement from "./pages/admin/ModelManagement";
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

// Clean public layout that doesn't force theme headers everywhere
const PublicLayout = () => <Outlet />;

// Admin layout wrapper - standalone component with its own layout
const AdminLayout = () => {
  return (
    <RequireAuth requireAdmin={true}>
      <Layout isAdminLayout={true}>
        <Outlet />
      </Layout>
    </RequireAuth>
  );
};

// Protected User Layout
const ProtectedUserLayout = () => (
  <RequireAuth>
    <Layout isAdminLayout={false}>
      <Outlet />
    </Layout>
  </RequireAuth>
);

// Export routes for reuse
export const routes: AppRoutes = {
  mainRoutes: [
    // Root structure with public pages
    {
      path: '/',
      element: <PublicLayout />,
      children: [
        // Home page at root
        { index: true, element: <ModernHomePage /> },
        
        // Auth routes
        { path: 'login', element: <UserLogin /> },
        { path: 'register', element: <Register /> },
        { path: 'unauthorized', element: <Unauthorized /> },
        { path: 'themes', element: <ThemeGallery /> },
        
        // Admin Login - Public but separate
        { path: 'admin/login', element: <AdminLogin /> },
        
        // Admin section with its own layout
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
            { path: "models", element: <Navigate to={ROUTES.ADMIN.STATS} replace /> },
          ],
        },
        
        // Protected Chat Routes - direct render without nested layout
        { 
          path: 'chat', 
          element: <RequireAuth><ChatPage /></RequireAuth>
        },
        { 
          path: 'chat/:conversationId', 
          element: <RequireAuth><ChatPage /></RequireAuth>
        },
        
        // Protected User Routes
        {
          path: 'user',
          element: <ProtectedUserLayout />,
          children: [
            { path: 'profile', element: <Profile /> }
          ],
        },
        
        // Catch all - 404
        { path: '*', element: <Navigate to={ROUTES.HOME} replace /> },
      ],
    },
  ],
};

// Export routes for App.tsx
export const appRoutes = routes.mainRoutes;