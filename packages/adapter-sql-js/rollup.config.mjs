import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @returns {import('rollup').RollupOptions}
 */
export default () => {
  return {
    input: 'lib/index.js',
    output: {
      file: 'dist/bundle.mjs',
      format: 'esm',
      sourcemap: true
    },
    plugins: [
      nodeResolve({ preferBuiltins: false, browser: true }),
      commonjs({}),
      alias({
        entries: [
          // The default Emscripten output contains code like `require("fs")`. This seems
          // to be unreachable, but Metro complains when it detects it.
          { find: 'fs', replacement: path.resolve(__dirname, 'vendored/empty.js') },
          { find: 'path', replacement: path.resolve(__dirname, 'vendored/empty.js') },
          { find: 'crypto', replacement: path.resolve(__dirname, 'vendored/empty.js') }
        ]
      })
    ],
    external: ['@powersync/common', 'async-mutex']
  };
};
