import { createReadStream, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import type { DevToolsPluginOptions } from '@vitejs/devtools-kit';

/** The route the diagnostics UI is served from. Static, outside any app router, so no auth guard sees it. */
export const UI_ROUTE = '/__powersync_devtools/';
/** The virtual module id of the injected in-page agent. */
const CLIENT_ID = 'virtual:powersync-diagnostics-client';
const RESOLVED_CLIENT_ID = '\0' + CLIENT_ID;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8'
};

export interface PowerSyncDevToolsOptions {
  /** Title of the dock entry. */
  title?: string;
  /**
   * How the in-page client is injected. `'html'` (default) adds a script tag to the served
   * `index.html`. Frameworks that render HTML themselves (for example Nuxt through Nitro) never serve
   * an `index.html`, so they load `@powersync/diagnostics-vite/client` from their own client entry
   * instead and pass `'none'` here.
   */
  inject?: 'html' | 'none';
}

/**
 * Attaches PowerSync diagnostics to a running app during `vite dev`.
 *
 * Three parts, all dev-only:
 * - An in-page script (injected into the app's HTML) that finds the app's live databases and serves
 *   the diagnostics integration to the UI over a `MessagePort`.
 * - The diagnostics UI, served by the dev server at {@link UI_ROUTE}. It is a static page outside the
 *   app's router, so it works in any host that can show an iframe and no app auth guard applies.
 * - A Vite DevTools dock entry pointing at that UI, when Vite DevTools is enabled. The dock renders
 *   inside the app page, so the iframe reaches the in-page script directly with `postMessage`.
 *
 * Nothing is added to a production build.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import powersyncDevtools from '@powersync/diagnostics-vite';
 * export default defineConfig({ plugins: [powersyncDevtools()] });
 * ```
 */
export default function powersyncDevtools(options: PowerSyncDevToolsOptions = {}): Plugin {
  const distDir = uiDistDir();

  const devtools: DevToolsPluginOptions = {
    setup(ctx) {
      ctx.docks.register({
        id: 'powersync',
        title: options.title ?? 'PowerSync',
        // The PowerSync mark, served with the UI (`standalone/public` in the UI package).
        icon: `${UI_ROUTE}powersync-icon.svg`,
        type: 'iframe',
        url: UI_ROUTE,
        category: 'app'
      });
    }
  };

  return {
    name: 'powersync-diagnostics',
    apply: 'serve',
    devtools,

    configureServer(server: ViteDevServer) {
      server.middlewares.use(UI_ROUTE.slice(0, -1), serveStatic(distDir));
    },

    resolveId(id) {
      return id === CLIENT_ID ? RESOLVED_CLIENT_ID : undefined;
    },

    load(id) {
      if (id === RESOLVED_CLIENT_ID) {
        // Re-export so Vite resolves and transforms the real client module for the browser.
        return `import '@powersync/diagnostics-vite/client';`;
      }
      return undefined;
    },

    transformIndexHtml() {
      if (options.inject === 'none') {
        return [];
      }
      return [{ tag: 'script', attrs: { type: 'module', src: `/@id/${CLIENT_ID}` }, injectTo: 'body' }];
    }
  };
}

/** Serves the built UI from `root`. Unknown paths fall back to `index.html` for the page itself. */
function serveStatic(root: string) {
  return (request: { url?: string }, response: import('node:http').ServerResponse, next: () => void) => {
    const requestPath = decodeURIComponent((request.url ?? '/').split('?')[0]);
    // Resolve inside the dist dir only; a path that escapes it is not served.
    const relative = normalize(requestPath === '/' || requestPath === '' ? 'index.html' : requestPath).replace(/^(\.\.[/\\])+/, '');
    const filePath = join(root, relative);
    if (!filePath.startsWith(root)) {
      return next();
    }
    const target = existsSync(filePath) && statSync(filePath).isFile() ? filePath : join(root, 'index.html');
    response.setHeader('Content-Type', MIME[extname(target)] ?? 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-store');
    createReadStream(target).pipe(response);
  };
}

/** The built diagnostics UI (`@powersync/diagnostics-ui/dist/standalone`) to serve under the route. */
function uiDistDir(): string {
  const require = createRequire(import.meta.url);
  const pkg = require.resolve('@powersync/diagnostics-ui/package.json');
  return join(dirname(pkg), 'dist', 'standalone');
}
