import { defineConfig, ViteUserConfig } from 'vitest/config';

const config: ViteUserConfig = {
  worker: {
    format: 'es'
  },
  plugins: [],
  test: {
    isolate: false,
    globals: true,
    include: ['tests/**/*.test.ts'],
    server: {
      deps: {
        // @powersync/sql-js ships a CommonJS build but declares "type": "module" in its package.json, so resolve with
        // vite instead of as an actual module.
        inline: ['@powersync/sql-js']
      }
    }
  }
};

export default defineConfig(config);
