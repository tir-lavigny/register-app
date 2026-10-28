import { execSync } from 'node:child_process'
import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const isProduction = process.env.VITE_APP_ENV === 'production'

// CI passes the release/dev/rev tag as VITE_BUILD_TAG; local builds fall back
// to the current commit short sha so the sidebar always shows what it is.
process.env.VITE_BUILD_TAG ??= (() => {
    try {
        return execSync('git rev-parse --short HEAD').toString().trim()
    } catch {
        return 'unknown'
    }
})()

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            devOptions: { enabled: true },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern:
                            /\/api\/register\/(categories|products|seasons)(\?.*)?$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'reference-data',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 86400,
                            },
                        },
                    },
                    {
                        urlPattern: /\/api\/stock\/locations(\?.*)?$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'reference-data',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 86400,
                            },
                        },
                    },
                    {
                        urlPattern: /\/api\/register\/members(\?.*)?$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'reference-data',
                            expiration: { maxEntries: 50, maxAgeSeconds: 900 },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'google-fonts-stylesheets',
                        },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-webfonts',
                            expiration: {
                                maxEntries: 30,
                                maxAgeSeconds: 60 * 60 * 24 * 365,
                            },
                        },
                    },
                ],
            },
            manifest: {
                name: isProduction
                    ? 'Tir Lavigny - Caisse'
                    : 'STG - Tir Lavigny - Caisse',
                short_name: isProduction ? 'Caisse' : 'STG - Caisse',
                description:
                    'Application de caisse pour la société de tir de Lavigny',
                theme_color: '#3b82f6',
                background_color: '#ffffff',
                display: 'standalone',
                start_url: '/',
                icons: [
                    {
                        src: '/app-icons/icon-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/app-icons/icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: '/app-icons/icon-192x192-maskable.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                    {
                        src: '/app-icons/icon-512x512-maskable.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src'),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },
})
