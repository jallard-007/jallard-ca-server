import { defineConfig } from 'vite';

export default defineConfig({
  base: '/minion-sims/',
  build: {
    outDir: '../../dist/minion-sims',
    assetsDir: 'assets',
    sourcemap: false,
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
