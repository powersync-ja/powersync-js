import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { RollupOptions, Plugin } from 'rollup';
import type { Node } from 'estree-walker';
import { asyncWalk, walk } from 'estree-walker';
import MagicString from 'magic-string';

import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const workerFileUri: Plugin = {
  // In non-modular workers, the script URL is always globalThis.location.href.
  name: 'workerFileUrl',
  resolveFileUrl({ relativePath }) {
    return `new URL('${relativePath}', globalThis.location.href)`;
  }
};

function bundleWorker(): RollupOptions {
  const plugins = [nodeResolve({ preferBuiltins: false, browser: true }), includeUriBundles(), workerFileUri, terser()];

  return {
    input: 'lib/worker/worker.js',
    output: {
      dir: `dist/worker/`,
      format: 'esm',
      sourcemap: true
    },
    plugins
  };
}

function bundledModuleForReactNativeWeb(): RollupOptions {
  return {
    input: 'lib/index.js',
    output: {
      file: 'dist/index.react_native_web.js',
      format: 'esm',
      sourcemap: true
    },
    external: ['@powersync/common', '@powersync/shared-internals', 'comlink'],
    plugins: disableDefaultWorkers()
  };
}

const options: RollupOptions[] = [bundledModuleForReactNativeWeb(), bundleWorker()];

function disableDefaultWorkers(): Plugin {
  return {
    name: 'disableSpawnDefaultPowerSyncWorker',
    transform(code, id) {
      if (!code.includes('function spawnDefaultPowerSyncWorker')) return;

      // In the build for React Native web, import.meta.url must not appear anywhere in the bundled output as Metro does
      // not generate ESM modules.
      // For details, see the comment on spawnDefaultPowerSyncWorker in src/worker/client.ts.
      const ms = new MagicString(code);

      const ast = this.parse(code);
      walk(ast, {
        enter(node) {
          if (node.type === 'FunctionDeclaration' && node.id.name === 'spawnDefaultPowerSyncWorker') {
            const body = node.body;
            ms.overwrite(
              (body as any).start,
              (body as any).end,
              `{
  throw new Error('You are using the React Native web build of the PowerSync SDK, which requires custom worker URLs. Please see the documentation at https://docs.powersync.com/client-sdks/frameworks/react-native-web-support for details.');
}
`
            );
            this.skip();
          }
        }
      });

      return {
        code: ms.toString(),
        map: ms.generateMap()
      };
    }
  };
}

// Plugin that replaces `new URL(x, import.meta.url)` with a resolved asset URL.
//
// We need to do this to ensure WebAssembly modules referenced by @journeyapps/wa-sqlite are copied into dist/.
function includeUriBundles(): Plugin {
  function isImportMetaUrl(node: Node): boolean {
    if (node.type !== 'MemberExpression') return false;

    const { object, property } = node;
    if (property.type !== 'Identifier' || property.name !== 'url') return false;

    return object.type === 'MetaProperty' && object.meta.name === 'import' && object.property.name === 'meta';
  }

  function extractUriImport(node: Node): string | undefined {
    // Do we have a new URI(x, y) expression?
    if (
      node.type != 'NewExpression' ||
      node.callee.type !== 'Identifier' ||
      node.callee.name != 'URL' ||
      node.arguments.length != 2
    ) {
      return;
    }

    const [importDesc, base] = node.arguments;
    if (importDesc.type !== 'Literal' || typeof (importDesc as any).value !== 'string') {
      return;
    }
    if (!isImportMetaUrl(base)) {
      return;
    }
    return (importDesc as any).value as string;
  }

  return {
    name: 'includeUriBundles',
    async transform(code, id) {
      if (!code.includes('import.meta.url')) return;

      let ms: MagicString | undefined;

      const parsed = this.parse(code);
      const plugin = this;
      await asyncWalk(parsed, {
        async enter(node) {
          const importedUri = extractUriImport(node);
          if (importedUri != null) {
            const resolvedUrl = new URL(importedUri, pathToFileURL(id));
            const resolvedPath = fileURLToPath(resolvedUrl);

            // See https://rollupjs.org/plugin-development/#file-urls
            const referenceId = plugin.emitFile({
              type: 'asset',
              name: path.basename(resolvedPath),
              source: await fs.readFile(resolvedPath)
            });

            ms ??= new MagicString(code);
            const start = (node as any).start as number;
            const end = (node as any).end as number;
            ms.overwrite(start, end, `import.meta.ROLLUP_FILE_URL_OBJ_${referenceId}`);
            this.skip();
          }
        }
      });

      if (ms) {
        return {
          code: ms.toString(),
          map: ms.generateMap()
        };
      }
    }
  };
}

export default options;
