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
    exclude: ['@journeyapps/wa-sqlite', '@journeyapps/powersync-sdk-web'],
    include: [
      '@journeyapps/powersync-sdk-common > uuid',
      '@journeyapps/powersync-sdk-web > event-iterator',
      '@journeyapps/powersync-sdk-web > js-logger',
      '@journeyapps/powersync-sdk-web > lodash/throttle',
      '@journeyapps/powersync-sdk-web > can-ndjson-stream'
    ]
  },
  plugins: [wasm(), topLevelAwait()],
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()]
  }
});
