import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { defineConfig, UserConfigExport } from 'vitest/config';
import * as path from 'path';

const config: UserConfigExport = {
  // This is only needed for local tests to resolve the package name correctly
  resolve: {
    alias: {
      /**
       * Note that this requires the Typescript to be compiled with `tsc`
       * first. This is required due to the format of Webworker URIs
       * they link to `.js` files.
       */
      '@journeyapps/powersync-sdk-web': path.resolve(__dirname, '../powersync-sdk-web/dist/src')
    }
  },
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()]
  },
  optimizeDeps: {
    // Don't optimise these packages as they contain web workers and WASM files.
    // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
    exclude: ['@journeyapps/wa-sqlite', '@journeyapps/powersync-sdk-web']
  },
  plugins: [wasm(), topLevelAwait()],
  test: {
    isolate: false,
    globals: true,
    include: ['tests/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: 'webdriverio',
      name: 'chrome' // browser name is required
    }
  }
};

export default defineConfig(config);
