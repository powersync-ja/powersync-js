import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { defineConfig, searchForWorkspaceRoot } from 'vite';

const fn = () => {
  const out = searchForWorkspaceRoot('../../../../');
  console.log('workspace root', out);
  return out;
};
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [wasm(), topLevelAwait(), react()],
  define: { 'process.env': {} },
  optimizeDeps: {
    // Don't optimize these packages as they contain web workers and WASM files.
    // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
    exclude: ['@journeyapps/wa-sqlite', '@powersync/web']
  },
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()]
  },
  server: {
    fs: {
      allow: ['../../../../../']
    }
  }
});
