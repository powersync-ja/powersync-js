import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

/** @type {import('rollup').RollupOptions} */
export default (commandLineArgs) => {
  const sourceMap = (commandLineArgs.sourceMap || 'true') == 'true';

  // Clears rollup CLI warning https://github.com/rollup/rollup/issues/2694
  delete commandLineArgs.sourceMap;

  return {
    input: 'src/index.ts',
    output: {
      format: 'cjs',
      file: 'dist/index.cjs',
      sourcemap: sourceMap,
      exports: 'named'
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        outDir: 'dist',
        sourceMap,
        /**
         * The Typescript plugin complains about internal Drizzle types not matching when selecting
         * other moduleResolution settings.
         */
        moduleResolution: 'bundler'
      })
    ],
    external: ['@powersync/common', /^drizzle-orm(\/.*)?$/]
  };
};
