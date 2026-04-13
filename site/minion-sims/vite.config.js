import { defineConfig } from 'vite';
import { createViteConfig } from '../../vite.base.js';

export default defineConfig(createViteConfig({
    base: '/minion-sims/',
    outDir: '../../dist/minion-sims',
    port: 5173,
}));
