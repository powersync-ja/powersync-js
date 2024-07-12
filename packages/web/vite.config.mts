import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  //   optimizeDeps: {
  //     exclude: ['shared-DB-worker']
  //   },

  build: {
    target: 'es2020',
    lib: {
      entry: 'lib/src/index.js', // The entry point for your library
      fileName: (_format) => `index.js`, // Output file naming convention
      formats: ['es']
    },
    rollupOptions: {
      // Ensure to externalize dependencies that shouldn't be bundled into your library
      external: [],
      output: {}
    }
  },
  plugins: [],
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()]
  }
});
