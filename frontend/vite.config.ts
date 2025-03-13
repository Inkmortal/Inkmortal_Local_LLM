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
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxy support for all /api paths
        rewrite: (path) => path,
      }
      // Removed redundant '/api/chat/ws' proxy as it's covered by the '/api' proxy
      // The main '/api' proxy handles WebSockets with ws: true
    }
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  base: '/' // Explicitly set the base URL
})