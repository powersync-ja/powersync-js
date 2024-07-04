import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';

export default (commandLineArgs) => {
  const sourcemap = (commandLineArgs.sourceMap || 'true') == 'true';

  // Clears rollup CLI warning https://github.com/rollup/rollup/issues/2694
  delete commandLineArgs.sourceMap;

  return {
    input: 'lib/index.js',
    output: {
      file: 'dist/main.js',
      format: 'cjs',
      sourcemap: sourcemap
    },
    plugins: [
      json(),
      nodeResolve({ preferBuiltins: false }),
      commonjs({}),
      inject({
        // Buffer: ['buffer', 'Buffer']
      })
    ]
    // external: ['node-fetch']
  };
};
