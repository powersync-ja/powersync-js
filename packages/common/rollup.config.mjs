import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import { dts } from 'rollup-plugin-dts';
import MagicString from 'magic-string';
import { walk } from 'estree-walker';

function defineBuild(isNode) {
  const suffix = isNode ? '.node' : '';
  const plugins = [
    [
      json(),
      nodeResolve({ preferBuiltins: false, browser: true }),
      commonjs({}),
      inject({
        Buffer: isNode ? ['node:buffer', 'Buffer'] : ['buffer/', 'Buffer']
      })
    ]
  ];
  if (!isNode) {
    plugins.push(checkNoIllegalAsyncIteratorUse());
  }

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
    plugins
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

function checkNoIllegalAsyncIteratorUse() {
  return {
    name: 'applyAsyncIteratorPonyfill',
    transform(code, id) {
      if (id.endsWith('compatibility.js')) return null;

      if (code.includes('Symbol.asyncIterator')) {
        throw new Error(`${id} is not allowed to use Symbol.asyncIterator. Import compatibility.ts instead.`);
      }

      return code;
    }
  };
}
