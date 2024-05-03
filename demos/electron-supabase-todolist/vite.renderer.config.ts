import type { ConfigEnv, UserConfig } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pluginExposeRenderer } from './vite.base.config.js';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import vitePluginRequire from 'vite-plugin-require';

// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<'renderer'>;
  const { root, mode, forgeConfigSelf } = forgeEnv;
  const name = forgeConfigSelf.name ?? '';

  return {
    root,
    mode,
    base: './',
    build: {
      outDir: `.vite/renderer/${name}`
    },
    publicDir: './public',
    envDir: '.', // Use this dir for env vars, not 'src'.
    optimizeDeps: {
      // Don't optimize these packages as they contain web workers and WASM files.
      // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
      exclude: ['@journeyapps/wa-sqlite', '@powersync/web'],
      include: [
        '@powersync/web > uuid',
        '@powersync/web > event-iterator',
        '@powersync/web > js-logger',
        '@powersync/web > lodash/throttle',
        '@powersync/web > can-ndjson-stream'
      ]
    },
    plugins: [
      // @ts-expect-error there is TS issue that doesn't actually affect the runtime
      wasm(),
      // @ts-expect-error there is TS issue that doesn't actually affect the runtime
      topLevelAwait(),
      react(),
      vitePluginRequire.default(),
      //   registerType: 'autoUpdate',
      //   includeAssets: ['powersync-logo.svg', 'supabase-logo.png', 'favicon.ico'],
      //   manifest: {
      //     theme_color: '#c44eff',
      //     background_color: '#c44eff',
      //     display: 'standalone',
      //     scope: '/',
      //     start_url: '/',
      //     name: 'PowerSync React Demo',
      //     short_name: 'PowerSync React',
      //     icons: [
      //       {
      //         src: '/icons/icon-192x192.png',
      //         sizes: '192x192',
      //         type: 'image/png'
      //       },
      //       {
      //         src: '/icons/icon-256x256.png',
      //         sizes: '256x256',
      //         type: 'image/png'
      //       },
      //       {
      //         src: '/icons/icon-384x384.png',
      //         sizes: '384x384',
      //         type: 'image/png'
      //       },
      //       {
      //         src: '/icons/icon-512x512.png',
      //         sizes: '512x512',
      //         type: 'image/png'
      //       }
      //     ]
      //   }
      // }),
      pluginExposeRenderer(name)
    ],
    worker: {
      format: 'es',
      // @ts-expect-error there is TS issue that doesn't actually affect the runtime
      plugins: () => [wasm(), topLevelAwait()]
    },
    resolve: {
      preserveSymlinks: true
    },
    clearScreen: false
  } as UserConfig;
});
