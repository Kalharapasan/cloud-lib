import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  // ── Development Server ──────────────────────────────────────
  server: {
    port: 5173,
    // Proxy /api to local backend so CORS is never a dev issue
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  // ── Production Build ────────────────────────────────────────
  build: {
    // Output to dist/ (committed to gitignore; uploaded to S3 via CI/CD)
    outDir: 'dist',
    // Wipe previous build before each new build
    emptyOutDir: true,
    // Generate source maps so CloudWatch can show line numbers in errors
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split vendor code for better caching on CDN
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },
});

