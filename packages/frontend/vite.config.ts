import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'react/jsx-runtime'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Polyfill global for AWS Chime SDK
    global: 'globalThis',
  },
  server: {
    port: 5175,
    host: '0.0.0.0', // Allow all external access
    strictPort: false,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    // HMR config for ngrok (use when testing with ngrok)
    // hmr: {
    //   clientPort: 443,
    //   host: 'mentalspaceehr.ngrok.app',
    // },
  },
});
