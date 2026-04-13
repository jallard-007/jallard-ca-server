import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { compression } from 'vite-plugin-compression2';

const ALREADY_COMPRESSED = /\.(png|jpe?g|webp|gif|avif|woff2|mp3|ogg|aac|flac|wav|zip|br|gz|zst)$/i;

export default defineConfig(({ mode }) => {
    const isProd = mode === 'production';

    let outDir = '../../dev/dist/period-tracker'
    if (isProd) {
        outDir = '../../prod/dist/period-tracker'
    }

    return {
        plugins: [
            react(),
            tailwindcss(),
            ...(isProd ? [
                compression({ algorithm: 'gzip', exclude: ALREADY_COMPRESSED }),
                compression({ algorithm: 'brotliCompress', exclude: ALREADY_COMPRESSED }),
            ] : []),
        ],
        base: '/period-tracker/',
        build: {
            minify: isProd ? 'terser' : false,
            ...(isProd && {
                terserOptions: {
                    compress: { passes: 2 },
                    mangle: true,
                    format: { comments: false },
                },
            }),
            outDir: outDir,
            assetsDir: 'assets',
            sourcemap: false,
            emptyOutDir: true,
        },
        server: {
            port: 5175,
            proxy: {
                '/period-tracker/api': 'http://localhost:8080',
            },
        },
    };
});
