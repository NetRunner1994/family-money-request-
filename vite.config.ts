import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://<user>.github.io/family-money-request-/ (a project
  // page, not a user/org root page), so every asset needs this path prefix.
  base: '/family-money-request-/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Family Tab — Kid Money Requests',
        short_name: 'Family Tab',
        description: "Kids ask for money, parents approve or decline — right from your phone's home screen.",
        theme_color: '#00B24A',
        background_color: '#EFF5EE',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/family-money-request-/',
        scope: '/family-money-request-/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Apply new versions immediately instead of waiting for every tab to
        // close — the new service worker takes over and old caches are purged,
        // so a normal reload always gets the latest app.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Never serve a stale index.html; always try the network for the page
        // shell so a fresh deploy is picked up right away.
        navigateFallback: '/family-money-request-/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'html-shell' },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
