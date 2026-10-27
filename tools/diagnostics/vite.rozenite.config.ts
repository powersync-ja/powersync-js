import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

// Builds the React Native DevTools panel. Rozenite finds a plugin by `dist/rozenite.json` in the
// package root of a direct dependency and serves `dist/` to React Native DevTools.

const root = fileURLToPath(new URL('./rozenite', import.meta.url));
const dist = fileURLToPath(new URL('./dist', import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

function rozeniteManifest(): Plugin {
  return {
    name: 'powersync:rozenite-manifest',
    closeBundle() {
      const manifest = {
        name: pkg.name,
        version: pkg.version,
        description: 'PowerSync DevTools: sync status, buckets, streams, local data, schema, and logs.',
        panels: [{ name: 'PowerSync', source: '/devtools/powersync.html' }],
        integrations: ['react-native']
      };
      writeFileSync(`${dist}/rozenite.json`, JSON.stringify(manifest, null, 2) + '\n');
    }
  };
}

export default defineConfig({
  root,
  base: './',
  build: {
    outDir: `${dist}/devtools`,
    emptyOutDir: true,
    rollupOptions: { input: `${root}/powersync.html` }
  },
  plugins: [rozeniteManifest()]
});
