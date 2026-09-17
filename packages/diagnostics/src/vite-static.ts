import { createReadStream, existsSync, statSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { UI_ROUTE } from './constants.js';
import { uiDistDir } from './definition.js';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8'
};

/**
 * Serves the diagnostics UI at {@link UI_ROUTE} from a plain Vite dev server, with no devframe hub.
 *
 * For hosts that embed the UI in their own iframe and hand it the integration over `postMessage`:
 * Nuxt DevTools v3 does this, with `./page` loaded in the app. The UI is a static page outside the
 * app's router, so no route guard or auth middleware applies to it. Serve-only; nothing reaches a
 * production build.
 */
export default function powersyncStatic(): Plugin {
  const distDir = uiDistDir();
  return {
    name: 'powersync-diagnostics-static',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(UI_ROUTE.slice(0, -1), serveStatic(distDir));
    }
  };
}

/** Serves the built UI from `root`. Unknown extension-less paths fall back to `index.html` for the page itself. */
function serveStatic(root: string) {
  return (request: { url?: string }, response: ServerResponse, next: () => void) => {
    const requestPath = decodeURIComponent((request.url ?? '/').split('?')[0]);
    // Resolve inside the dist dir only; a path that escapes it is not served.
    const relative = normalize(requestPath === '/' || requestPath === '' ? 'index.html' : requestPath).replace(/^(\.\.[/\\])+/, '');
    const filePath = join(root, relative);
    if (!filePath.startsWith(root)) {
      return next();
    }
    const exists = existsSync(filePath) && statSync(filePath).isFile();
    if (!exists && extname(relative)) {
      // A missing file (for example a devframe probe for `__connection.json`) is a 404, not the page.
      response.statusCode = 404;
      response.end();
      return;
    }
    const target = exists ? filePath : join(root, 'index.html');
    response.setHeader('Content-Type', MIME[extname(target)] ?? 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-store');
    createReadStream(target).pipe(response);
  };
}
