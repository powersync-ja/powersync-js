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
    json(),
    nodeResolve({ preferBuiltins: false, browser: true }),
    commonjs({}),
    inject({
      Buffer: isNode ? ['node:buffer', 'Buffer'] : ['buffer/', 'Buffer']
    })
  ];
  if (!isNode) {
    plugins.unshift(applyAsyncIteratorPonyfill());
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
    plugins: [plugins],
    external: ['async-mutex', 'bson', isNode ? 'event-iterator' : undefined]
  };
}

/**
 * Replaces `Symbol.asyncIterator` with a ponyfill in bundled dependencies (specifically `EventIterator`).
 */
function applyAsyncIteratorPonyfill() {
  // A fake file we import into every file using SymbolasyncIterator
  const POLYFILL_ID = '\0symbol-async-iterator';

  return {
    name: 'applyAsyncIteratorPonyfill',
    async resolveId(source) {
      if (source === POLYFILL_ID) {
        return { id: POLYFILL_ID };
      }
      return null;
    },
    load(id) {
      if (id === POLYFILL_ID) {
        // Outside of Node.JS, we replace Symbol.asyncIterator with an import to this symbol. This allows us to use
        // Symbol.asyncIterator internally. If users install the recommended polyfill, https://github.com/Azure/azure-sdk-for-js/blob/%40azure/core-asynciterator-polyfill_1.0.2/sdk/core/core-asynciterator-polyfill/src/index.ts#L4-L6
        // they can also use our async iterables on React Native.
        return `
export const symbolAsyncIterator = Symbol.asyncIterator ?? Symbol.for('Symbol.asyncIterator');
        `;
      }
    },
    transform(code, id) {
      if (id === POLYFILL_ID) return null;
      if (!code.includes('Symbol.asyncIterator')) return null;

      const ast = this.parse(code);
      const s = new MagicString(code);

      let replaced = false;

      const symbolName = 'symbolAsyncIterator';

      walk(ast, {
        enter(node) {
          // Replace Symbol.asyncIterator
          if (
            node.type === 'MemberExpression' &&
            !node.computed &&
            node.object.type === 'Identifier' &&
            node.object.name === 'Symbol' &&
            node.property.type === 'Identifier' &&
            node.property.name === 'asyncIterator'
          ) {
            replaced = true;
            s.overwrite(node.start, node.end, symbolName);
          }
        }
      });

      if (!replaced) return null;

      s.prepend(`import { ${symbolName} } from ${JSON.stringify(POLYFILL_ID)};\n`);

      return {
        code: s.toString(),
        map: s.generateMap({ hires: true })
      };
    }
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
