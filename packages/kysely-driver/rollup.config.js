import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';

/** @type {import('rollup').RollupOptions} */
export default (commandLineArgs) => {
  return [
    {
      input: 'src/index.ts',
      output: {
        format: 'cjs',
        file: 'dist/index.cjs',
        sourcemap: true,
        exports: 'named'
      },
      plugins: [
        resolve(),
        commonjs(),
        typescript({
          tsconfig: './tsconfig.json',
          outDir: 'dist',
          sourceMap: true
        })
      ],
      external: ['@powersync/common', 'kysely']
    },
    // This is required to avoid https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/docs/problems/FalseESM.md
    {
      input: './lib/src/index.d.ts',
      output: [{ file: 'dist/index.d.cts', format: 'cjs' }],
      plugins: [dts()]
    }
  ];
};
