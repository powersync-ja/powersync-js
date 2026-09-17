import { createPluginFromDevframe } from '@vitejs/devtools-kit/node';
import type { Plugin } from 'vite';
import { definition } from './definition.js';

export interface PowerSyncDevToolsOptions {
  /** Title of the dock entry. */
  title?: string;
}

/**
 * Mounts PowerSync diagnostics into Vite DevTools.
 *
 * The definition becomes a dock: the diagnostics UI in an iframe, a client script in the app page
 * that serves the app's live databases, and the same functions exposed to agents over MCP at
 * `/__devtools/__mcp`. Requires Vite DevTools (Vite >= 8.3 with `devtools: true`, or the
 * `@vitejs/devtools` plugin). Nothing is added to a production build.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import powersyncDevtools from '@powersync/diagnostics/vite';
 * export default defineConfig({ devtools: true, plugins: [powersyncDevtools()] });
 * ```
 */
export default function powersyncDevtools(options: PowerSyncDevToolsOptions = {}): Plugin {
  return createPluginFromDevframe(definition, {
    name: 'powersync-diagnostics',
    dock: options.title ? { title: options.title } : undefined
  });
}
