import { defineConfig } from 'vitest/config';

// The logic under test is pure: it reads plain protocol data and SQL results. No browser is needed,
// unlike the SDK packages, whose tests open real databases.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts']
  }
});
