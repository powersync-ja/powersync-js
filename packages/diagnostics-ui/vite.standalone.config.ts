import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

// Builds the standalone, self-contained diagnostics page (dist/standalone/) that any host can embed
// in an iframe. It talks to the agent over a `postMessage` transport, so the embedder relays wire
// messages to the real agent channel (e.g. a Flutter DevTools extension over the VM service).
// Unlike the library build, this bundles all dependencies so the page needs no external resolution.
export default defineConfig({
  root: fileURLToPath(new URL('./standalone', import.meta.url)),
  base: './',
  plugins: [vue(), tailwindcss()],
  resolve: { dedupe: ['vue', 'nanostores'] },
  build: {
    outDir: fileURLToPath(new URL('./dist/standalone', import.meta.url)),
    emptyOutDir: true
  }
});
