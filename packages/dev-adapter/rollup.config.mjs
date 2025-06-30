import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';

/**
 * @returns {import('rollup').RollupOptions}
 */
export default (commandLineArgs) => {
  const sourceMap = (commandLineArgs.sourceMap || 'true') == 'true';

  // Clears rollup CLI warning https://github.com/rollup/rollup/issues/2694
  delete commandLineArgs.sourceMap;

  return {
    input: 'lib/index.js',
    output: {
      file: 'dist/bundle.mjs',
      format: 'esm',
      sourcemap: sourceMap
    },
    plugins: [nodeResolve({ preferBuiltins: false, browser: true }), commonjs({})],
    external: ['@powersync/common']
  };
};
