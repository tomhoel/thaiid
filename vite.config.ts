import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

/**
 * Service-worker caching is an app-shell/offline-UX mechanism only — never a
 * security boundary. Cache Storage is readable by any script on the origin, so
 * the runtime rules below are an explicit allowlist: hashed build output and
 * public template images may be cached, and everything that can carry identity
 * data (/api, auth) is denied and must go to the network.
 */
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Digital ID',
        short_name: 'Digital ID',
        description: 'A sovereign-grade digital identity wallet.',
        theme_color: '#0C1526',
        background_color: '#080F1C',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache only content-hashed build output.
        globPatterns: ['**/*.{js,css,html,woff2}'],
        // Templates are large and only needed during card generation.
        globIgnores: ['**/templates/**'],
        navigateFallback: '/index.html',
        // Never let the SPA fallback swallow an auth callback or an API call.
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, request, sameOrigin }) =>
              Boolean(sameOrigin) &&
              request.method === 'GET' &&
              url.pathname.startsWith('/templates/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'card-templates',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    // api/ is compiled as NodeNext, so its internal imports carry a .js
    // extension that points at a .ts file on disk. Vite resolves specifiers
    // literally, so the integration test cannot load a handler without this.
    alias: [{ find: /^\.\/_lib\/(.*)\.js$/, replacement: './_lib/$1.ts' }],
  },
});
