import type { ConfigEnv, UserConfig } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pluginExposeRenderer } from './vite.base.config.js';
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
      include: []
    },
    plugins: [react(), vitePluginRequire.default(), pluginExposeRenderer(name)],
    worker: {
      format: 'es'
    },
    resolve: {
      preserveSymlinks: true
    },
    clearScreen: false
  } as UserConfig;
});
