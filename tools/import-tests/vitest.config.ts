import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import { defineConfig, ViteUserConfigExport } from 'vitest/config';

export default defineConfig(async () => {
  const { playwright } = await import('@vitest/browser-playwright');
  return {
    worker: {
      format: 'es',
      plugins: () => [wasm(), topLevelAwait()]
    },
    optimizeDeps: {
      // Don't optimise these packages as they contain web workers and WASM files.
      // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
      exclude: ['@journeyapps/wa-sqlite', '@powersync/web'],
      include: ['async-mutex', 'comlink', 'bson']
    },
    plugins: [wasm(), topLevelAwait()],
    test: {
      isolate: false,
      globals: true,
      include: ['src/**/*.test.ts'],
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [
          {
            browser: 'chromium'
          }
        ]
      }
    }
  } satisfies ViteUserConfigExport;
});
