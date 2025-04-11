import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // Listen on all addresses
    strictPort: true, // Fail if port is already in use
    open: true,
    proxy: {
      // API routes
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      // Auth routes
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Admin routes
      '/admin': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Health check
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Protected routes
      '/protected': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    },
    allowedHosts: [
      'seadragoninkmortal.com',
      'api.seadragoninkmortal.com',
      'localhost'
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  base: './', // Use relative paths for better compatibility
})