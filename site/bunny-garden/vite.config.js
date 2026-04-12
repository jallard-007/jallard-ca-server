import { defineConfig } from 'vite';

export default defineConfig({
  base: '/bunny-garden/',
  build: {
    outDir: '../../dist/bunny-garden',
    assetsDir: 'assets',
    sourcemap: false,
    emptyOutDir: true,
  },
  server: {
    port: 5174,
  },
});
