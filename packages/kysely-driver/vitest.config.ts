import { defineConfig, ViteUserConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

const config: ViteUserConfig = {
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
      provider: playwright(),
      instances: [
        {
          browser: 'chromium'
        }
      ]
    }
  }
};

export default defineConfig(config);
