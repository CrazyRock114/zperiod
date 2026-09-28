import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // No manualChunks: forcing jspdf/three into named chunks hoisted them
        // into the eager graph. Vite's default splitting already keeps three.js
        // behind the lazy 3D components and jspdf behind the PDF action.
        manualChunks: undefined,
      },
    },
  },
});
