import { defineConfig, UserConfigExport } from 'vitest/config';
import { resolve } from 'path';

import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

const config: UserConfigExport = {
  // This is only needed for local tests to resolve the package name correctly
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()]
  },
  resolve: {
    alias: {
      // Mock Nuxt's #app import for testing
      '#app': resolve(__dirname, 'tests/mocks/nuxt-app.ts')
    }
  },
  optimizeDeps: {
    exclude: ['@journeyapps/wa-sqlite', '@powersync/web'],
    include: ['bson', 'async-mutex', 'comlink']
  },
  plugins: [wasm(), topLevelAwait()],
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    maxConcurrency: 1,
    sequence: {
      shuffle: false, // Disable shuffling of test files
      concurrent: false // Run test files sequentially
    },
    browser: {
      enabled: true,
      /**
       * Starts each test in a new iFrame
       */
      isolate: true,
      provider: 'playwright',
      headless: true,
      instances: [
        {
          browser: 'chromium'
        }
      ]
    }
  }
};

export default defineConfig(config);
