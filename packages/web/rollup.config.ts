import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { RollupOptions, Plugin } from 'rollup';
import type { Node } from 'estree-walker';
import { asyncWalk } from 'estree-walker';
import MagicString from 'magic-string';

import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

function bundleWorker(minified: boolean): RollupOptions {
  const plugins = [nodeResolve({ preferBuiltins: false, browser: true }), includeUriBundles()];
  if (minified) {
    plugins.push(terser());
  }

  const name = minified ? 'powersync.min.worker.js' : 'powersync.worker.js';
  return {
    input: 'lib/worker/worker.js',
    output: {
      file: `dist/${name}`,
      format: 'iife',
      sourcemap: true,
      inlineDynamicImports: true
    },
    plugins
  };
}

const options: RollupOptions[] = [bundleWorker(false), bundleWorker(true)];

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
    resolveFileUrl({ relativePath }) {
      return `new URL('${relativePath}', globalThis.location.href)`;
    },
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
          } else if (isImportMetaUrl(node)) {
            // In non-modular workers, the script URL is always globalThis.location.href.
            ms ??= new MagicString(code);
            const start = (node as any).start as number;
            const end = (node as any).end as number;
            ms.overwrite(start, end, 'globalThis.location.href');
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
