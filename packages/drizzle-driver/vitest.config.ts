import { defineConfig, UserConfigExport } from 'vitest/config';

const config: UserConfigExport = {
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['@journeyapps/wa-sqlite']
  },
  test: {
    isolate: false,
    globals: true,
    include: ['tests/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: 'playwright',
      instances: [
        {
          browser: 'chromium'
        }
      ]
    }
  }
};

export default defineConfig(config);
