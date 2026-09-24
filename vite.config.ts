import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'local-news-api',
    configureServer(server) {
      server.middlewares.use('/api/news', async (req, res) => {
        if (req.method !== 'GET') { res.statusCode = 405; res.end(); return; }
        try {
          const { newsResponse } = await import('./server/news.mjs');
          const response = await newsResponse();
          res.statusCode = response.status;
          response.headers.forEach((value: string, key: string) => res.setHeader(key, value));
          res.end(await response.text());
        } catch { res.statusCode = 503; res.end('{"error":"News unavailable"}'); }
      });
    },
  }],
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
