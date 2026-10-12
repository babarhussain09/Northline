import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const target = process.env.VITE_PROXY_TARGET || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target, changeOrigin: true },
      '/health': { target, changeOrigin: true },
      '/ready': { target, changeOrigin: true },
      '/sitemap.xml': { target, changeOrigin: true },
      '/robots.txt': { target, changeOrigin: true },
    },
  },
});
