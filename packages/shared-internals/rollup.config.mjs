import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import { dts } from 'rollup-plugin-dts';
import MagicString from 'magic-string';
import { walk } from 'estree-walker';

function defineWebSocketBuild(isNode) {
  const suffix = isNode ? '.node' : '';
  const plugins = [
    [
      json(),
      nodeResolve({ preferBuiltins: false, browser: true }),
      commonjs({}),
      checkNoIllegalAsyncIteratorUse(),
      inject({
        Buffer: isNode ? ['node:buffer', 'Buffer'] : ['buffer/', 'Buffer']
      })
    ]
  ];

  return {
    input: 'lib/client/sync/stream/WebSocketSupport.js',
    output: [
      {
        file: `dist/websockets${suffix}.mjs`,
        format: 'esm',
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
    // RSocket only contains CJS builds for Node.js. To support ESM and to ensure we support Web/React Native as well,
    // we bundle and transform parts of the SDK using RSocket. The rest of the SDK consists of unbundled direct tsc
    // outputs.
    defineWebSocketBuild(false),
    defineWebSocketBuild(true),
    // Run a no-emit build to verify we're not using Symbol.asyncIterator without fallbacks in our sources and
    // dependencies.
    {
      input: 'lib/index.js',
      output: [
        {
          file: `dist/unused.js`,
          format: 'esm'
        }
      ],
      plugins: [checkNoIllegalAsyncIteratorUse(), noEmit()],
      external: ['@powersync/common']
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
    }
  };
}

function noEmit() {
  return {
    name: 'noEmit',
    generateBundle(_, bundle) {
      for (const file in bundle) {
        delete bundle[file];
      }
    }
  };
}
