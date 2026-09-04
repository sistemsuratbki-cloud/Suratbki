import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: true, // Allow external connections for mobile testing
    https: false // Use HTTPS in production via Vercel
  },
  resolve: {
    alias: {
      stream: 'stream-browserify'
    }
  },
  define: {
    global: 'globalThis'
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          pdfjs: ['pdfjs-dist']
        }
      }
    },
    // Optimize for mobile browsers
    target: ['es2015', 'safari11', 'ios11'],
    // Use esbuild minifier (faster, built-in)
    minify: 'esbuild'
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    esbuildOptions: {
      target: 'es2015'
    }
  }
});
