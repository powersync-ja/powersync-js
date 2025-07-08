import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @returns {import('rollup').RollupOptions}
 */
export default (commandLineArgs) => {
  const sourceMap = (commandLineArgs.sourceMap || 'true') == 'true';

  // Clears rollup CLI warning https://github.com/rollup/rollup/issues/2694
  delete commandLineArgs.sourceMap;

  return [
    {
      input: 'lib/index.js',
      output: {
        file: 'dist/bundle.mjs',
        format: 'esm',
        sourcemap: sourceMap
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
        terser({ sourceMap })
      ],
      // This makes life easier
      external: [
        // This has dynamic logic - makes bundling hard
        'cross-fetch'
      ]
    },
    {
      input: 'lib/dev/index.js',
      output: [
        {
          file: 'dist/dev/bundle.dev.mjs',
          format: 'esm',
          sourcemap: sourceMap
        },
        {
          file: 'dist/dev/bundle.dev.cjs',
          format: 'cjs',
          sourcemap: sourceMap
        }
      ],
      plugins: [
        replace({
          delimiters: ['', ''],
          preventAssignment: true
        }),
        nodeResolve({ preferBuiltins: false, browser: true }),
        commonjs({}),
        alias({
          entries: [
            { find: 'fs', replacement: path.resolve(__dirname, 'vendored/empty.js') },
            { find: 'path', replacement: path.resolve(__dirname, 'vendored/empty.js') },
            { find: 'crypto', replacement: path.resolve(__dirname, 'vendored/empty.js') }
            // add others as needed
          ]
        })
      ],
      external: ['@powersync/common']
    }
  ];
};
