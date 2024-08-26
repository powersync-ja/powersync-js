import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { fileURLToPath, URL } from 'url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); // Needed since the config file is also an ES module

// https://vitejs.dev/config/
export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    rollupOptions: {
      input: 'src/index.html'
    },
    emptyOutDir: true
  },
  esbuild: {},
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      // https://jira.mongodb.org/browse/NODE-5773
      { find: 'bson', replacement: require.resolve('bson') }
    ]
  },
  publicDir: '../public',
  envDir: '..', // Use this dir for env vars, not 'src'.
  optimizeDeps: {
    // Don't optimize these packages as they contain web workers and WASM files.
    // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
    exclude: ['@journeyapps/wa-sqlite', '@powersync/web'],
    include: []
    // include: ['@powersync/web > js-logger'], // <-- Include `js-logger` when it isn't installed and imported.
  },
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,svg}',
          // Be selective with the fonts we're pre-caching, otherwise we end up with quite a lot
          '**/lato-{normal,heavy}-*.woff2'
        ]
      },
      manifest: {
        theme_color: '#c44eff',
        background_color: '#c44eff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        name: 'PowerSync Yjs Document Collaboration Demo',
        short_name: 'PowerSync Yjs',
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
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()]
  }
});
