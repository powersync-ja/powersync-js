import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default () => {
  return {
    input: 'lib/index.js',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      // We do this so that we can inject on BSON's crypto usage.
      replace({
        'const { crypto } = globalThis;': '// removed crypto destructuring assignment from globalThis',
        "require('crypto').randomBytes;": 'nodejsMathRandomBytes; // removed crypto.randomBytes',
        delimiters: ['', ''],
        preventAssignment: true
      }),
      json(),
      nodeResolve({
        preferBuiltins: false
      }),
      commonjs({}),
      inject({
        Buffer: ['@craftzdog/react-native-buffer', 'Buffer'],
        ReadableStream: ['web-streams-polyfill/ponyfill', 'ReadableStream'],
        TextEncoder: ['text-encoding', 'TextEncoder'],
        TextDecoder: ['text-encoding', 'TextDecoder'],
        // injecting our crypto implementation
        crypto: path.resolve('./vendor/crypto.js')
      }),
      alias({
        entries: [
          {
            find: 'react-native/Libraries/Blob/BlobManager',
            replacement: path.resolve(__dirname, './vendor/BlobManager.js')
          }
        ]
      })
    ],
    external: [
      '@journeyapps/react-native-quick-sqlite',
      '@powersync/common',
      '@powersync/react',
      'node-fetch',
      'js-logger',
      'react-native',
      'react',
      'async-mutex'
    ]
  };
};
