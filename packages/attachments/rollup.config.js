import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';

/** @type {import('rollup').RollupOptions} */
export default (commandLineArgs) => {
  const sourceMap = (commandLineArgs.sourceMap || 'true') == 'true';

  // Clears rollup CLI warning https://github.com/rollup/rollup/issues/2694
  delete commandLineArgs.sourceMap;

  const plugins = [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      outDir: 'dist',
      sourceMap
    })
  ];

  return [
    {
      input: 'src/index.ts',
      output: {
        format: 'cjs',
        file: 'dist/index.cjs',
        sourcemap: sourceMap,
        exports: 'named'
      },
      plugins,
      external: ['@powersync/common', 'expo-file-system', 'base64-arraybuffer']
    },
    {
      input: 'src/node.ts',
      output: {
        format: 'cjs',
        file: 'dist/node.cjs',
        sourcemap: sourceMap,
        exports: 'named'
      },
      plugins,
      external: ['@powersync/common', 'fs', 'path']
    },
    {
      input: './lib/index.d.ts',
      output: [{ file: 'dist/index.d.cts', format: 'cjs' }],
      plugins: [dts()]
    },
    {
      input: './lib/node.d.ts',
      output: [{ file: 'dist/node.d.cts', format: 'cjs' }],
      plugins: [dts()]
    }
  ];
};