import { defineConfig, UserConfigExport } from 'vitest/config';

const config: UserConfigExport = {
  worker: {
    format: 'es',
    plugins: () => []
  },
  optimizeDeps: {
    // Don't optimise these packages as they contain web workers and WASM files.
    // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
    exclude: ['@journeyapps/wa-sqlite', '@powersync/web'],
    include: []
  },
  plugins: [],
  test: {
    isolate: false,
    globals: true,
    include: ['src/**/*.test.ts'],
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
