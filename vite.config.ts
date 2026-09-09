import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/imd': {
        target: 'https://mausam.imd.gov.in',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/imd/, ''),
      },
    },
  },
});