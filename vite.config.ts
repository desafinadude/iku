import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // GitHub Pages serves the app from /<repo>/; the deploy workflow sets BASE_PATH.
  base: process.env.BASE_PATH || '/',
  // Accept both Vite-style and Next/Vercel-style public env names.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icons/*.png'],
      workbox: {
        // Keep Google Fonts (text and icon fonts) for offline use.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } }
          }
        ]
      },
      manifest: {
        id: './',
        name: 'Iku — trip planner',
        short_name: 'Iku',
        description: 'Collect ideas, plan days, see it on a map.',
        lang: 'en',
        theme_color: '#0E6B60',
        background_color: '#F4F4F1',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        start_url: './',
        scope: './',
        categories: ['travel', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ],
        // Shown in Android's richer install sheet.
        screenshots: [
          { src: 'screenshots/phone-days.jpg', sizes: '780x1688', type: 'image/jpeg', form_factor: 'narrow', label: 'A day of the trip' },
          { src: 'screenshots/phone-ideas.jpg', sizes: '780x1688', type: 'image/jpeg', form_factor: 'narrow', label: 'Collected ideas' },
          { src: 'screenshots/wide-board.jpg', sizes: '1440x900', type: 'image/jpeg', form_factor: 'wide', label: 'Ideas, days and map side by side' }
        ],
        // Long-press the app icon for these.
        shortcuts: [
          { name: 'Today’s plan', short_name: 'Days', url: './?tab=days', icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Map', short_name: 'Map', url: './?tab=map', icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }] }
        ]
      }
    })
  ]
})
