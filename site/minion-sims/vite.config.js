import { defineConfig } from 'vite';
import { compression } from 'vite-plugin-compression2';

const ALREADY_COMPRESSED = /\.(png|jpe?g|webp|gif|avif|woff2|mp3|ogg|aac|flac|wav|zip|br|gz|zst)$/i;

export default defineConfig({
    plugins: [
        compression({ algorithm: 'gzip', exclude: ALREADY_COMPRESSED }),
        compression({ algorithm: 'brotliCompress', exclude: ALREADY_COMPRESSED }),
    ],
    base: '/minion-sims/',
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser']
                }
            }
        },
        minify: 'terser',
        terserOptions: {
            compress: {
                passes: 2
            },
            mangle: true,
            format: {
                comments: false
            }
        },
        outDir: '../../dist/minion-sims',
        assetsDir: 'assets',
        sourcemap: false,
        emptyOutDir: true,
    },
    server: {
        port: 5173,
    },
});
