import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // Source maps for production error tracking (e.g. Sentry) without
    // exposing them publicly -- upload separately and delete from the dist
    // folder before serving, per standard practice.
    sourcemap: true,
  },
});
