import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';

export default (commandLineArgs) => {
  const sourcemap = (commandLineArgs.sourceMap || 'true') == 'true';

  // Clears rollup CLI warning https://github.com/rollup/rollup/issues/2694
  delete commandLineArgs.sourceMap;

  return [
    {
      input: 'lib/index.js',
      output: {
        file: 'dist/index.js',
        format: 'esm',
        sourcemap: sourcemap
      },
      plugins: [
        json(),
        nodeResolve({ preferBuiltins: false, browser: true }),
        commonjs({}),
        inject({
          Buffer: ['buffer', 'Buffer'],
          ReadableStream: ['web-streams-polyfill', 'ReadableStream' ],
          // Used by can-ndjson-stream
          TextDecoder: ['text-encoding', 'TextDecoder']
        })
      ],
      // This makes life easier 
      external: [
        // This has dynamic logic - makes bundling hard
        'cross-fetch',
        // TODO: make the useDefaults logic better. Currently need access to this package directly
         'js-logger'
      ]
    },
    // Todo: This was just to have a copy of what I tried for react-native.
    // It's likely that we need to produce separate builds for web and react-native. This output isn't currently targeted by the rn package
    {
      input: 'lib/index.js',
      output: {
        file: 'dist/index.rn.cjs',
        format: 'cjs',
        exports: 'named',
        sourcemap: sourcemap
      },
      plugins: [
        json(),
        nodeResolve({ preferBuiltins: false, browser: true }),
        commonjs({}),
        inject({
          Buffer: ['buffer', 'Buffer'],
     
        })
      ],
    }
  ];
};
