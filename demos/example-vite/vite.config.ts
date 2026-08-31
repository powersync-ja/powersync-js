import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

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
  worker: {
    format: 'es'
  },
  test: {
    globals: true,
    include: ['../e2e/**/*.test.js'],
    isolate: true,
    maxConcurrency: 1,
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [
        {
          browser: 'chromium'
        }
      ]
    }
  }
});
