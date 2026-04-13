import { compression } from 'vite-plugin-compression2';

const ALREADY_COMPRESSED = /\.(png|jpe?g|webp|gif|avif|woff2|mp3|ogg|aac|flac|wav|zip|br|gz|zst)$/i;

/**
 * @param {{ base: string, outDir: string, port: number, manualChunks?: Record<string,string[]>|null, extraPlugins?: import('vite').Plugin[] }} options
 *
 * Pass `manualChunks: null` to disable chunk splitting (e.g. for non-Phaser sites).
 * Omit to use the default Phaser chunk split.
 * Pass `extraPlugins` to prepend plugins (e.g. React, Tailwind) before compression.
 */
export function createViteConfig({ base, outDir, port, manualChunks = { phaser: ['phaser'] }, extraPlugins = [] }) {
    return ({ mode }) => {
        const isProd = mode === 'production';

        return {
            plugins: [...extraPlugins, ...(isProd ? [
                compression({ algorithm: 'gzip', exclude: ALREADY_COMPRESSED }),
                compression({ algorithm: 'brotliCompress', exclude: ALREADY_COMPRESSED }),
            ] : [])],
            base,
            build: {
                ...(manualChunks ? {
                    rollupOptions: {
                        output: { manualChunks },
                    },
                } : {}),
                minify: isProd ? 'terser' : false,
                ...(isProd && {
                    terserOptions: {
                        compress: {
                            passes: 2,
                        },
                        mangle: true,
                        format: {
                            comments: false,
                        },
                    },
                }),
                outDir,
                assetsDir: 'assets',
                sourcemap: false,
                emptyOutDir: true,
            },
            server: {
                port,
            },
        };
    };
}
