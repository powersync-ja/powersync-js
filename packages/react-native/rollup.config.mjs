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
      nodeResolve({}),
      commonjs(),
      inject({
        Buffer: ['@craftzdog/react-native-buffer', 'Buffer'],
        ReadableStream: ['web-streams-polyfill', 'ReadableStream'],
        TextEncoder: ['text-encoding', 'TextEncoder'],
        TextDecoder: ['text-encoding', 'TextDecoder']
      })
    ],
    external: ['bson', 'react-native', 'react', '@powersync/react', 'node-fetch']
  }
];

export default config;
