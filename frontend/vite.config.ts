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
    hmr: {
      protocol: 'wss',
      host: 'seadragoninkmortal.com',
      clientPort: 443 // Required for Cloudflare Tunnel
    },
    proxy: {
      // WebSocket endpoint - MUST come before general /api rule
      '/api/chat/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('WebSocket proxy error:', err);
          });
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            console.log('WebSocket connection attempt to:', req.url);
          });
        }
      },
      // API routes (general)
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
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
  }
  // Removed base config - causes issues with Cloudflare Tunnel in dev mode
})