import inject from '@rollup/plugin-inject';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

const input = 'lib/index.js';

const config = [
  {
    input,
    output: {
      file: 'dist/main.js',
      format: 'cjs',
      sourcemap: true
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
  }
];

export default config;
