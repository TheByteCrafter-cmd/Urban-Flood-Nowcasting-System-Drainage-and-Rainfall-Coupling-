import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/weather': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/api/imd': {
        target: 'https://mausam.imd.gov.in',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/imd/, ''),
      },
    },
  },
});