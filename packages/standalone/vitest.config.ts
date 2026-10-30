import { configDefaults, defineConfig } from 'vitest/config';

// The standalone client uses recent JavaScript APIs that aren't available on old Node versions. We intentionally target
// modern runtimes to reduce code size, end users can polyfill if needed.
const supportsStandaloneClient = Number(process.versions.node.split('.')[0]) >= 26;

// Empty config to be part of the vitest workspace
export default defineConfig({
  test: {
    exclude: supportsStandaloneClient ? configDefaults.exclude : [...configDefaults.exclude, 'tests/**']
  }
});
