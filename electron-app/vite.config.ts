import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@discord-mini/shared': path.resolve(__dirname, '../shared/src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
