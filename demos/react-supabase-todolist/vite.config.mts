import { fileURLToPath, URL } from 'url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import powersyncDevtools from '@powersync/diagnostics/vite';

// https://vitejs.dev/config/
export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    rollupOptions: {
      input: fileURLToPath(new URL('./src/index.html', import.meta.url))
    },
    emptyOutDir: true
  },
  resolve: {
    alias: [{ find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) }]
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version)
  },
  publicDir: '../public',
  envDir: '..', // Use this dir for env vars, not 'src'.
  optimizeDeps: {
    // Don't optimize these packages as they contain web workers and WASM files.
    // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
    exclude: ['@powersync/web']
  },
  // Vite DevTools with the PowerSync dock, on the dev server only.
  devtools: { apply: 'serve' },
  plugins: [
    react(),
    powersyncDevtools(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // The SQLite WASM builds are over the 2 MiB default; the app needs them precached to work offline.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },
      includeAssets: ['powersync-logo.svg', 'supabase-logo.png', 'favicon.ico'],
      manifest: {
        theme_color: '#c44eff',
        background_color: '#c44eff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        name: 'PowerSync React Demo',
        short_name: 'PowerSync React',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-256x256.png',
            sizes: '256x256',
            type: 'image/png'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  worker: {
    format: 'es'
  }
});
