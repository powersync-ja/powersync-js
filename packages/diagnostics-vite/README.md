# PowerSync Diagnostics — Vite plugin

This package (`packages/diagnostics-vite`) attaches [PowerSync](https://powersync.com) diagnostics to a running app during `vite dev`. It gives you a live view of your app's own PowerSync client: sync status, buckets, sync streams, the local database, the schema, and logs.

Everything runs in development only. Nothing from this package reaches a production build.

## How it works

The plugin does two things while the dev server runs:

1. It injects a small script into your app page. The script finds the app's open PowerSync databases and hands them to the diagnostics UI when the UI asks.
2. It serves the diagnostics UI at `/__powersync_devtools/`. The UI is a static page outside your app's router, so no route guard or auth middleware applies to it.

The UI only works inside your app page: it asks the page that embeds it for a connection to the script from step 1. So the plugin supports two hosts:

- **Vite DevTools.** With [Vite DevTools](https://devtools.vite.dev) enabled, the plugin adds a **PowerSync** dock. The dock opens the UI in an iframe inside your app page.
- **A framework's own DevTools.** A framework that embeds an iframe in the app page, such as Nuxt DevTools, points that iframe at `/__powersync_devtools/`. `@powersync/nuxt` does this.

Opening `/__powersync_devtools/` directly in a browser tab shows "Waiting for the diagnostics integration…" and nothing else. There is no app page around it to connect to.

## Getting started

Install the plugin as a development dependency:

```bash
pnpm add -D @powersync/diagnostics-vite
```

Add it to your Vite config:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import powersyncDevtools from '@powersync/diagnostics-vite';

export default defineConfig({
  plugins: [powersyncDevtools()]
});
```

Enable the core diagnostics stream when you connect. This gives the Buckets tab per-bucket totals:

```ts
await db.connect(connector, { diagnostics: true });
```

Start your dev server and open the **PowerSync** dock in Vite DevTools. The first time, Vite DevTools asks you to confirm the browser with a one-time code printed in your terminal.

## Options

```ts
powersyncDevtools({
  // Title of the Vite DevTools dock entry. Default: 'PowerSync'.
  title: 'PowerSync',
  // How the in-page script is injected. Default: 'html'.
  inject: 'html'
});
```

| Option   | Values            | Use                                                                                                                                                                                             |
| -------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`  | string            | The dock title in Vite DevTools.                                                                                                                                                                |
| `inject` | `'html'`, `'none'` | `'html'` adds the script to the served `index.html`. Use `'none'` for a framework that renders its own HTML (for example Nuxt) and load `@powersync/diagnostics-vite/client` from your app instead. |

## Use with a framework

Some frameworks render HTML themselves and never serve an `index.html`, so the plugin cannot inject the script. For those, pass `inject: 'none'` and import the client from your app's client entry in development:

```ts
if (import.meta.env.DEV) {
  import('@powersync/diagnostics-vite/client');
}
```

[`@powersync/nuxt`](https://github.com/powersync-ja/powersync-js/tree/main/packages/nuxt) does this for you. Set `useDiagnostics: true` in its options and the diagnostics UI appears as a tab in Nuxt DevTools.

## Requirements

| You want                                    | You need                                                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| The **PowerSync** dock inside Vite DevTools   | Vite `>= 8.3` with `devtools: true` in your Vite config, plus `@powersync/web >= 2.2`.                       |
| The UI inside a framework's DevTools (Nuxt) | Vite `>= 7.0` and `@powersync/web >= 2.2`. The framework integration embeds `/__powersync_devtools/` itself. |

## Related packages

- [`@powersync/diagnostics-core`](https://github.com/powersync-ja/powersync-js/tree/main/packages/diagnostics-core) — the protocol and the JavaScript agent this plugin runs.
- [`@powersync/diagnostics-ui`](https://github.com/powersync-ja/powersync-js/tree/main/packages/diagnostics-ui) — the UI this plugin serves.
