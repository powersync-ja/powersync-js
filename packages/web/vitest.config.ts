import path from 'path';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import { defineConfig, UserConfigExport } from 'vitest/config';

const config: UserConfigExport = {
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  // This is only needed for local tests to resolve the package name correctly
  resolve: {
    alias: {
      /**
       * Note that this requires the Typescript to be compiled with `tsc`
       * first. This is required due to the format of Webworker URIs
       * they link to `.js` files.
       */
      '@powersync/web': path.resolve(__dirname, './lib/src'),
      // https://jira.mongodb.org/browse/NODE-5773
      bson: require.resolve('bson')
    }
  },
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()]
  },
  optimizeDeps: {
    // Don't optimise these packages as they contain web workers and WASM files.
    // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
    exclude: ['@journeyapps/wa-sqlite', '@powersync/web'],
    include: ['bson']
  },
  plugins: [wasm(), topLevelAwait()],
  test: {
    isolate: false,
    globals: true,
    include: ['tests/**/*.test.ts'],
    browser: {
      enabled: true,
      provider: 'webdriverio',
      headless: true,
      name: 'chrome' // browser name is required
    }
  }
};

export default defineConfig(config);
