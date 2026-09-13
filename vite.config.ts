import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/binance-options': {
        target: 'https://eapi.binance.com/eapi/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/binance-options/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', proxyReq => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
      '/api/binance-spot': {
        target: 'https://api.binance.com/api/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/binance-spot/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', proxyReq => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      }
    }
  }
})
