import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    root: './frontend',
    plugins: [react()],
    css: {
        postcss: './frontend/postcss.config.js',
    },
    server: {
        port: 5174,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false,
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve('./frontend/src'),
        },
    },
})
