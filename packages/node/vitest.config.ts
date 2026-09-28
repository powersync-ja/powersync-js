import { defineConfig } from 'vitest/config';

// We need to define an empty config to be part of the vitest works
export default defineConfig({
  test: {
    silent: false,
    // This doesn't make the tests considerably slower. It may improve reliability for GH actions.
    fileParallelism: false,
    setupFiles: ['./tests/setup.ts'],
    server: {
      deps: {
        // @powersync/sql-js ships a CommonJS build but declares "type": "module" in its package.json, so resolve with
        // vite instead of as an actual module.
        inline: ['@powersync/sql-js']
      }
    }
  }
});
