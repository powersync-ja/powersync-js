import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

/**
 * We use Rollup to bundle PNPM workspace dependency resolving packages.
 * We need to do this since we have a chicken-egg problem when doing the first
 * install in a linked workspace. 
 * The install script can't depend on other packages since they wont be available in the first install.
 */

export default {
  input: 'pnpmfile.ts',
  output: {
    file: 'dist/.pnpmfile.cjs',
    format: 'cjs',
    exports: 'default'
  },
  // Only Node.js built-ins are external - @pnpm packages will be bundled
  external: [/^node:/, 'fs', 'path'],
  treeshake: {
    moduleSideEffects: false,
  },
  plugins: [
    json(),
    resolve({
      preferBuiltins: true
    }),
    commonjs(),
    typescript({
      include: ['pnpmfile.ts'],
      compilerOptions: {
        module: 'ES2020',
        moduleResolution: 'bundler',
        target: 'ES2020',
        lib: ['ES2020'],
        types: ['node'],
        declaration: false,
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        strict: false,
        importHelpers: false
      }
    }),
    terser()
  ]
};