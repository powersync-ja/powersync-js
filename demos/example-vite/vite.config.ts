import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { defineConfig } from 'vite';

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
  envDir: '..', // Use this dir for env vars, not 'src'.
  optimizeDeps: {
    // Don't optimize these packages as they contain web workers and WASM files.
    // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
    exclude: ['@journeyapps/wa-sqlite', '@powersync/web'],
    include: [
      '@powersync/web > event-iterator',
      '@powersync/web > js-logger',
      '@powersync/web > lodash/throttle',
      '@powersync/web > can-ndjson-stream',
      '@powersync/web > bson',
      '@powersync/web > buffer',
      '@powersync/web > rsocket-core',
      '@powersync/web > rsocket-websocket-client',
      '@powersync/web > cross-fetch'
    ]
  },
  plugins: [wasm(), topLevelAwait()],
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()]
  }
});
