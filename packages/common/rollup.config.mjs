import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import { nodeExternals } from 'rollup-plugin-node-externals';
import { dts } from 'rollup-plugin-dts';

/**
 * @returns {import('rollup').RollupOptions}
 */
export default (commandLineArgs) => {
  return [
    {
      input: 'lib/index.js',
      output: [
        {
          file: 'dist/bundle.mjs',
          format: 'esm',
          sourcemap: true
        },
        {
          file: 'dist/bundle.cjs',
          format: 'cjs',
          sourcemap: true
        }
      ],
      plugins: [json(), nodeResolve({ preferBuiltins: false, browser: true }), commonjs({}), nodeExternals()]
    },
    {
      input: './lib/index.d.ts',
      output: [{ file: 'dist/index.d.cts', format: 'cjs' }],
      plugins: [dts()]
    }
  ];
};
