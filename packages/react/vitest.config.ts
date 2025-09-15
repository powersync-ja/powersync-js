import { defineConfig, UserConfigExport } from 'vitest/config';

import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

const config: UserConfigExport = {
  // This is only needed for local tests to resolve the package name correctly
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()]
  },
  optimizeDeps: {
    // Don't optimise these packages as they contain web workers and WASM files.
    // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
    exclude: ['@journeyapps/wa-sqlite', '@powersync/web'],
    include: ['bson', 'async-mutex', 'comlink']
  },
  plugins: [wasm(), topLevelAwait()],
  test: {
    globals: true,
    include: ['tests/**/*.test.tsx'],
    maxConcurrency: 1,
    // This doesn't currently seem to work in browser mode, but setting this for one day when it does
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
      headless: false,
      instances: [
        {
          browser: 'chromium'
        }
      ]
    }
  }
};

export default defineConfig(config);
