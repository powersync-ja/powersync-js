import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

const base = process.env.BASE_PATH || '/';

// https://vitejs.dev/config/
export default defineConfig({
  base,
  root: 'src',
  build: {
    outDir: '../dist',
    rollupOptions: {
      input: 'src/index.html'
    },
    emptyOutDir: true
  },
  resolve: {
    alias: [{ find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) }]
  },
  publicDir: '../public',
  envDir: '..', // Use this dir for env vars, not 'src'.
  optimizeDeps: {
    // Don't optimize these packages as they contain web workers and WASM files.
    // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
    exclude: ['@journeyapps/wa-sqlite', '@powersync/web']
  },
  plugins: [
    {
      name: 'html-base-path',
      transformIndexHtml(html) {
        return html
          .replace('href="favicon.ico"', `href="${base}favicon.ico"`)
          .replace('href="icons/', `href="${base}icons/`);
      }
    },
    tanstackRouter({
      generatedRouteTree: './routeTree.gen.ts',
      routesDirectory: './routes',
      quoteStyle: 'single',
      autoCodeSplitting: true
    }),
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['powersync-logo.svg', 'supabase-logo.png', 'favicon.ico'],
      manifest: {
        theme_color: '#c44eff',
        background_color: '#c44eff',
        display: 'standalone',
        scope: base,
        start_url: base,
        name: 'PowerSync Diagnostics',
        short_name: 'Diagnostics',
        icons: [
          {
            src: `${base}icons/icon-192x192.png`,
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: `${base}icons/icon-256x256.png`,
            sizes: '256x256',
            type: 'image/png'
          },
          {
            src: `${base}icons/icon-384x384.png`,
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: `${base}icons/icon-512x512.png`,
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
