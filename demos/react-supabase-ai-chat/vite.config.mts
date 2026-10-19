import { fileURLToPath, URL } from 'url';

import powersyncDevtools from '@powersync/diagnostics/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

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
  resolve: {
    alias: [{ find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) }]
  },
  publicDir: '../public',
  envDir: '..', // Use this dir for env vars, not 'src'.
  // Use this demo's tsconfig. Otherwise Vite can look up the monorepo's root tsconfig for files outside `src`.
  tsconfig: '../tsconfig.json',
  optimizeDeps: {
    // Don't optimize these packages as they contain web workers and WASM files.
    // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
    exclude: ['@powersync/web']
  },
  // Vite DevTools with the PowerSync dock, on the dev server only. The dock starts on the right edge, because on the
  // bottom edge it covers the sidebar's footer.
  devtools: { apply: 'serve', dockPreferences: { defaultPosition: 'right' } },
  plugins: [react(), tailwindcss(), powersyncDevtools()],
  worker: {
    format: 'es'
  }
});
