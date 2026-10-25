import { defineConfig } from 'vite';

// `base: './'` keeps the static build working under any GitHub Pages repository path.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2022',
    reportCompressedSize: true,
  },
  server: { port: 5173 },
  preview: { port: 4173, strictPort: true },
});
