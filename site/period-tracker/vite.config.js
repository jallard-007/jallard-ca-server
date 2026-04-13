import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createViteConfig } from '../../vite.base.js';

export default defineConfig(createViteConfig({
    base: '/period-tracker/',
    outDir: '../../dist/period-tracker',
    port: 5175,
    manualChunks: null,
    extraPlugins: [react(), tailwindcss()],
}));
