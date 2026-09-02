import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

// `vite` (dev) serves the playground; `vite build` produces the compiled library in dist/.
// The library ships compiled ESM (no raw .vue), so consumers like Nuxt/WXT resolve plain JS.
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    dedupe: ['vue', 'nanostores']
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'index.js'
    },
    outDir: 'dist',
    // Keep the Tailwind CSS produced separately by the CLI.
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      external: [
        'vue',
        'nanostores',
        '@nanostores/vue',
        'reka-ui',
        '@tanstack/vue-table',
        'lucide-vue-next',
        'clsx',
        'tailwind-merge',
        'class-variance-authority',
        /^@powersync\//
      ]
    }
  },
  server: { port: 5199 }
});
