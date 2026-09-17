import type { Nuxt } from 'nuxt/schema';
import { UI_ROUTE } from '@powersync/diagnostics';

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
