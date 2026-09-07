import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';

// `vite` (dev) serves the playground; `vite build` produces the compiled library in dist/.
// The library ships compiled ESM (no raw .vue), so consumers like Nuxt/WXT resolve plain JS.
export default defineConfig({
  plugins: [vue(), tailwindcss(), Icons({ compiler: 'vue3' })],
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
      ],
      // Emit a single chunk. Code-splitting Shiki's dynamic imports produced a chunk that mixed an
      // externalized `import { h } from 'vue'` with Shiki's own `var h`, which stricter parsers
      // (wxt/rolldown in the extension build) reject as a redeclaration. One chunk de-conflicts cleanly.
      output: { inlineDynamicImports: true }
    }
  },
  server: { port: 5199 }
});
