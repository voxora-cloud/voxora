import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'VoxoraWidget',
      fileName: () => 'voxora.js',
      formats: ['iife']
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Inline all dependencies in a single file
        inlineDynamicImports: true,
        // Global variable name when loaded via script tag
        name: 'VoxoraWidget'
      }
    },
    // Optimize for production (esbuild is faster and built-in)
    minify: 'esbuild',
    sourcemap: true
  },
  server: {
    port: 3003,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.API_URL_PRODUCTION': JSON.stringify(process.env.API_URL_PRODUCTION || 'http://localhost:3002')
  }
});
