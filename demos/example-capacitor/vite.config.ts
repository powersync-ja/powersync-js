import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vite';
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
  envDir: '..', // Use this dir for env vars, not 'src'.
  optimizeDeps: {
    // Don't optimize these packages as they contain web workers and WASM files.
    // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
    exclude: ['@powersync/web']
  },
  worker: {
    format: 'es'
  },
  server: {
    // Reachable from a device or emulator during live reload.
    host: true,
    port: 5174,
    strictPort: true,
    // The local backend sends no CORS headers, so the app reaches it through the dev server.
    proxy: { '/api': 'http://localhost:6060' }
  },
  // Vite DevTools with the PowerSync dock, on the dev server only.
  devtools: { apply: 'serve' },
  plugins: [powersyncDevtools()]
});
