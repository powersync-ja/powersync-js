import { defineConfig } from 'wxt';

// The extension is pure transport: it reuses @powersync/diagnostics-ui and -core unchanged,
// and bridges the DevTools panel to the page's agent (which broadcasts on a same-origin
// BroadcastChannel) via a MAIN-world content script, an isolated relay, and the background worker.
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  // Use esbuild/postcss for CSS, not lightningcss: lightningcss rewrites diagnostics-ui's precompiled
  // Tailwind v4 `@layer`/`color-scheme` CSS in a way that breaks dark-mode token resolution (borders
  // rendered light). Nuxt consumes the same CSS untransformed and looks correct.
  vite: () => ({
    css: { transformer: 'postcss' },
    build: { cssMinify: 'esbuild' }
  }),
  manifest: {
    name: 'PowerSync Diagnostics',
    description: 'Inspect a live PowerSync client from Chrome DevTools.',
    // POC targets the local demo. Broaden for real use.
    host_permissions: ['http://localhost/*']
  }
});
