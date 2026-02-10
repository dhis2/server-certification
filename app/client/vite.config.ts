import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
    build: {
        outDir: 'build',
    },
    server: {
        hmr: {
            port: 24678,
        },
    },
    plugins: [
        react({
            babel: {
                plugins: ['styled-jsx/babel'],
            },
        }),
    ],
    resolve: {
        alias: [
            {
                // Allow moment.js to be used as an ESM module
                find: /^moment$/,
                replacement: path.resolve(__dirname, './node_modules/moment/moment.js'),
            },
        ],
    },
})
