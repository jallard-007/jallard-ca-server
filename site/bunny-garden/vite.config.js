import { defineConfig } from 'vite';
import { createViteConfig } from '../../vite.base.js';

export default defineConfig(createViteConfig({
    base: '/bunny-garden/',
    outDir: '../../dist/bunny-garden',
    port: 5174,
}));
