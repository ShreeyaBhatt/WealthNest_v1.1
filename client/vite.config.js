/**
 * vite.config.js — Vite Build Tool Configuration
 *
 * WHY Vite over Create React App (CRA)?
 * Vite uses native ES modules and is significantly faster than CRA.
 * - Dev server starts in ~300ms (CRA takes 10–30 seconds)
 * - Hot Module Replacement (HMR) is near-instant
 * - Industry standard in 2024+
 *
 * The proxy config below is important:
 * When React calls /api/..., Vite forwards it to Node.js (port 5000)
 * This avoids CORS issues during development.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // ─── Development Server ────────────────────────────────────
  server: {
    port: 3000,
    // API Proxy — forwards requests to avoid CORS in development
    proxy: {
      '/api': {
        target: 'http://localhost:5000',   // Node.js backend
        changeOrigin: true,
        secure: false,
      },
      '/django': {
        target: 'http://localhost:8000',   // Django backend
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/django/, '/api'),
      },
    },
  },

  // ─── Path Aliases ──────────────────────────────────────────
  // Instead of: import Button from '../../../components/common/Button'
  // You can write: import Button from '@/components/common/Button'
  resolve: {
    alias: {
      '@': '/src',
    },
  },

  // ─── Build Configuration ───────────────────────────────────
  build: {
    outDir: 'dist',
    sourcemap: false,  // Set to true for debugging production builds
  },
});
