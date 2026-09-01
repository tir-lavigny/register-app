import path from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src'),
        },
    },
    test: {
        environment: 'jsdom',
        coverage: {
            provider: 'v8',
            exclude: ['**/components/ui/**', '**/scr/api/**'],
            reporter: ['text', 'html', 'lcov'],
        },
    },
})
