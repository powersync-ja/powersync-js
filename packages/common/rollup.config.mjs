import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default (commandLineArgs) => {
  const sourcemap = (commandLineArgs.sourceMap || 'true') == 'true';

  // Clears rollup CLI warning https://github.com/rollup/rollup/issues/2694
  delete commandLineArgs.sourceMap;

  return {
    input: 'lib/index.js',
    output: {
      file: 'dist/bundle.mjs',
      format: 'esm',
      sourcemap: sourcemap
    },
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
      terser()
    ],
    // This makes life easier
    external: [
      // This has dynamic logic - makes bundling hard
      'cross-fetch',
      // TODO: make the useDefaults logic better. Currently need access to this package directly
      'js-logger'
    ]
  };
};
