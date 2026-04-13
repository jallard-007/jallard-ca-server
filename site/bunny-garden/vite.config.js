import { defineConfig } from 'vite';
import { compression } from 'vite-plugin-compression2';

const ALREADY_COMPRESSED = /\.(png|jpe?g|webp|gif|avif|woff2|mp3|ogg|aac|flac|wav|zip|br|gz|zst)$/i;

export default defineConfig(({ mode }) => {
    const isProd = mode === 'production';

    let outDir = '../../dev/dist/bunny-garden'
    if (isProd) {
        outDir = '../../prod/dist/bunny-garden'
    }

    return {
        plugins: isProd ? [
            compression({ algorithm: 'gzip', exclude: ALREADY_COMPRESSED }),
            compression({ algorithm: 'brotliCompress', exclude: ALREADY_COMPRESSED }),
        ] : [],
        base: '/bunny-garden/',
        build: {
            rollupOptions: {
                output: { manualChunks: { phaser: ['phaser'] } },
            },
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
            port: 5174,
            proxy: {
                '/bunny-garden/api': 'http://localhost:8080',
            },
        },
    };
});
