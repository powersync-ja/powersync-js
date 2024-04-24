import { defineConfig, UserConfigExport } from 'vitest/config';

const config: UserConfigExport = {
  test: {
    environment: 'jsdom'
  }
};

export default defineConfig(config);
