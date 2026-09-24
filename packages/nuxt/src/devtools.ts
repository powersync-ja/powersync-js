import { readFileSync } from 'node:fs';
import { addVitePlugin, createResolver } from '@nuxt/kit';
import type { Nuxt } from 'nuxt/schema';
import { UI_ROUTE } from '@powersync/diagnostics';

/**
 * Where the dev server serves the script that runs inside the diagnostics tab and hands it the
 * DevTools colour mode. Passed to `@powersync/diagnostics/vite-static` as a page script.
 */
export const DEVTOOLS_THEME_SCRIPT = '/__powersync-nuxt/devtools-theme.js';

/**
 * Registers the PowerSync tab in Nuxt DevTools.
 *
 * Used with Nuxt DevTools 3. The tab is an iframe onto the diagnostics UI that
 * `@powersync/diagnostics/vite-static` serves at {@link UI_ROUTE}. That route is static and outside
 * the app's router, so no route middleware (for example an auth guard) can redirect it, and the app
 * needs no configuration for it. Nuxt DevTools 4 shows the devframe dock instead.
 */
export function setupDevToolsUI(nuxt: Nuxt) {
  const port = nuxt.options.devServer?.port || 3000;
  const resolver = createResolver(import.meta.url);

  // The theme bridge: Nuxt DevTools exposes its colour mode to iframe tabs; this script forwards it to
  // the UI's own theme message, so the tab follows DevTools and shows no toggle of its own.
  const themeScriptPath = resolver.resolve('./runtime/assets/devtools-theme.js');
  addVitePlugin({
    name: 'powersync-devtools-theme',
    apply: 'serve',
    configureServer(server: any) {
      server.middlewares.use(DEVTOOLS_THEME_SCRIPT, (_request: any, response: any, next: any) => {
        try {
          response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(readFileSync(themeScriptPath));
        } catch {
          next();
        }
      });
    }
  });

  // Devtools requires a URL starting with http:// or https:// to recognize it as an image otherwise it will be inferred as an Iconify icon
  const iconUrl = `http://localhost:${port}/assets/powersync-icon.svg`;

  nuxt.hook('devtools:customTabs', (tabs: any[]) => {
    tabs.push({
      name: 'powersync-inspector',
      title: 'PowerSync',
      icon: iconUrl,
      view: {
        type: 'iframe',
        src: `http://localhost:${port}${UI_ROUTE}`
      }
    });
  });
}
