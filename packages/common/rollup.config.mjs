import * as path from 'node:path';

import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import { dts } from 'rollup-plugin-dts';

function defineBuild(isNode) {
  const suffix = isNode ? '.node' : '';

  return {
    input: 'lib/index.js',
    output: [
      {
        file: `dist/bundle${suffix}.mjs`,
        format: 'esm',
        sourcemap: true
      },
      {
        file: `dist/bundle${suffix}.cjs`,
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: [
      [
        json(),
        nodeResolve({ preferBuiltins: false, browser: true }),
        commonjs({}),
        inject({
          Buffer: isNode ? ['node:buffer', 'Buffer'] : path.resolve('lib/buffer.js')
        })
      ]
    ],
    external: ['async-mutex', 'bson', 'buffer/', 'event-iterator']
  };
}

/**
 * @returns {import('rollup').RollupOptions}
 */
export default () => {
  return [
    defineBuild(false),
    defineBuild(true),
    {
      input: './lib/index.d.ts',
      output: [{ file: 'dist/index.d.cts', format: 'cjs' }],
      plugins: [dts()]
    }
  ];
};
