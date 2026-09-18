import { createPluginFromDevframe } from '@vitejs/devtools-kit/node';
import type { Plugin } from 'vite';
import { definition } from './definition.js';

const PLUGIN_NAME = 'powersync-diagnostics';

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
  const plugin = createPluginFromDevframe(definition, { name: PLUGIN_NAME });
  plugin.devtools!.setup = async (context) => {
    // Frameworks that run a second Vite server for server-side rendering set it up too; the browser
    // never talks to that server, so the definition mounts on the client-facing one only.
    if (context.viteConfig?.build?.ssr) return;
    const base = context.viteConfig?.base ?? '/';
    const mount = createPluginFromDevframe(definition, {
      name: PLUGIN_NAME,
      dock: {
        ...(options.title ? { title: options.title } : {}),
        // Vite DevTools resolves bare client-script specifiers to `/@id/<specifier>` without the
        // server's `base`, so under a non-root base (Nuxt serves Vite at `/_nuxt/`) the script
        // request falls through to the app. Point at the module URL under the base instead.
        ...(base !== '/'
          ? {
              clientScript: {
                importFrom: `${base.replace(/\/?$/, '/')}@id/${definition.packageName}/client`,
                eager: true
              }
            }
          : {})
      }
    });
    await mount.devtools?.setup(context);
  };
  return plugin;
}
