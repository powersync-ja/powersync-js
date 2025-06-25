import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

/**
 * @returns {import('rollup').RollupOptions}
 */
export default (commandLineArgs) => {
  const sourceMap = (commandLineArgs.sourceMap || 'true') == 'true';

  // Clears rollup CLI warning https://github.com/rollup/rollup/issues/2694
  delete commandLineArgs.sourceMap;

  return {
    input: 'lib/index.js',
    output: [
      {
        file: 'dist/bundle.mjs',
        format: 'esm',
        sourcemap: sourceMap
      },
      {
        file: 'dist/bundle.cjs',
        format: 'cjs',
        sourcemap: sourceMap
      }
    ],
    plugins: [
      json(),
      nodeResolve({ preferBuiltins: false, browser: true }),
      commonjs({}),
      inject({
        Buffer: ['buffer', 'Buffer'],
        ReadableStream: ['web-streams-polyfill/ponyfill', 'ReadableStream'],
        // Used by can-ndjson-stream
        TextDecoder: ['text-encoding', 'TextDecoder']
      }),
      terser({ sourceMap })
    ],
    // This makes life easier
    external: [
      // This has dynamic logic - makes bundling hard
      'cross-fetch'
    ]
  };
};
