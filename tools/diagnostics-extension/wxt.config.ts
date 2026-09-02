import { defineConfig } from 'wxt';

// The extension is pure transport: it reuses @powersync/diagnostics-ui and -core unchanged,
// and bridges the DevTools panel to the page's agent (which broadcasts on a same-origin
// BroadcastChannel) via a MAIN-world content script, an isolated relay, and the background worker.
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'PowerSync Diagnostics',
    description: 'Inspect a live PowerSync client from Chrome DevTools.',
    // POC targets the local demo. Broaden for real use.
    host_permissions: ['http://localhost/*']
  }
});
