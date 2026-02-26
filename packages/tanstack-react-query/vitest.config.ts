import { defineConfig, UserConfigExport } from 'vitest/config';

const config: UserConfigExport = {
  // This is only needed for local tests to resolve the package name correctly
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['@journeyapps/wa-sqlite']
  },
  plugins: [],
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
