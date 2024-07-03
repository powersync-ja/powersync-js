import inject from '@rollup/plugin-inject';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

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
        Buffer: ['@craftzdog/react-native-buffer', 'Buffer'],
        ReadableStream: ['web-streams-polyfill', 'ReadableStream'],
        TextEncoder: ['text-encoding', 'TextEncoder'],
        TextDecoder: ['text-encoding', 'TextDecoder']
      })
    ],
    external: [
      '@journeyapps/react-native-quick-sqlite',
      '@powersync/react',
      'bson',
      'node-fetch',
      'react-native',
      'react-native/Libraries/Blob/BlobManager',
      'react'
    ]
  };
};
