import { defineConfig, UserConfigExport } from 'vitest/config';

const config: UserConfigExport = {
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
      'drizzle-orm/sqlite-core/query-builders/query',
      'drizzle-orm/sqlite-core/db',
      'drizzle-orm/sqlite-core/dialect',
      'drizzle-orm/sqlite-core/session',
      'drizzle-orm/table'
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
