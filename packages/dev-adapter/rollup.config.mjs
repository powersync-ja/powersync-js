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
export default (commandLineArgs) => {
  const sourceMap = (commandLineArgs.sourceMap || 'true') == 'true';

  // Clears rollup CLI warning https://github.com/rollup/rollup/issues/2694
  delete commandLineArgs.sourceMap;

  return {
    input: 'lib/index.js',
    output: {
      file: 'dist/bundle.mjs',
      format: 'esm',
      sourcemap: sourceMap
    },
    plugins: [
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
  };
};
