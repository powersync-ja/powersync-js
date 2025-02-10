import topLevelAwait from 'vite-plugin-top-level-await';
import { defineConfig, UserConfigExport } from 'vitest/config';

const config: UserConfigExport = {
  plugins: [topLevelAwait()],
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
