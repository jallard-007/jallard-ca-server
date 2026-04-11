import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { compression } from 'vite-plugin-compression2';

const ALREADY_COMPRESSED = /\.(png|jpe?g|webp|gif|avif|woff2|mp3|ogg|aac|flac|wav|zip|br|gz|zst)$/i;

export default defineConfig(({ mode }) => {
    return {
        plugins:[
            compression({ algorithm: 'gzip', exclude: ALREADY_COMPRESSED }),
            compression({ algorithm: 'brotliCompress', exclude: ALREADY_COMPRESSED }),
        ],
        server: {
            port: 5173,
            proxy: {
                '/api/': 'http://localhost:8080',
            },
        },
    };
});
