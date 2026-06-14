import { defineConfig, ViteUserConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

const config: ViteUserConfig = {
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    include: [
      'drizzle-orm',
      'drizzle-orm/casing',
      'drizzle-orm/column',
      'drizzle-orm/entity',
      'drizzle-orm/logger',
      'drizzle-orm/pg-core/primary-keys',
      'drizzle-orm/query-promise',
      'drizzle-orm/relations',
      'drizzle-orm/sql/sql',
      'drizzle-orm/sqlite-core',
      'drizzle-orm/sqlite-core/db',
      'drizzle-orm/sqlite-core/dialect',
      'drizzle-orm/sqlite-core/query-builders/query',
      'drizzle-orm/sqlite-core/session'
    ],
    exclude: ['@journeyapps/wa-sqlite']
  },
  test: {
    isolate: false,
    globals: true,
    include: ['tests/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } }
          : {}
      ),
      instances: [
        {
          browser: 'chromium'
        }
      ]
    }
  }
};

export default defineConfig(config);
