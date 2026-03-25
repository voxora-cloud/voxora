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
    emptyOutDir: false, // Don't wipe the HTML build
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        name: 'VoxoraWidget'
      }
    }
  }
});
