/**
 * Instructions for updating App.tsx to include NotificationProvider
 * 
 * 1. Import NotificationProvider from the new component
 * 2. Wrap the entire app with the provider
 */

// In frontend/src/App.tsx:

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import NotificationProvider from './components/ui/Notification';
import './App.css';
import routes from './routes';

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={route.element}
              />
            ))}
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;