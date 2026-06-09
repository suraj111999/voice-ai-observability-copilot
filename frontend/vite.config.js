import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const GHL_FRAME_ANCESTORS = [
  'https://app.gohighlevel.com',
  'https://app.leadconnectorhq.com',
  'https://*.gohighlevel.com',
  'https://*.leadconnectorhq.com',
].join(' ');

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/webhooks': 'http://localhost:3001',
    },
    headers: {
      'Content-Security-Policy': `frame-ancestors ${GHL_FRAME_ANCESTORS} 'self'`,
    },
  },
  preview: {
    headers: {
      'Content-Security-Policy': `frame-ancestors ${GHL_FRAME_ANCESTORS} 'self'`,
    },
  },
});
