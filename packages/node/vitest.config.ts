import { defineConfig } from 'vitest/config';

// We need to define an empty config to be part of the vitest works
export default defineConfig({
  test: {
    silent: false,
    // This doesn't make the tests considerably slower. It may improve reliability for GH actions.
    fileParallelism: false,
    testTimeout: 15000
  }
});
