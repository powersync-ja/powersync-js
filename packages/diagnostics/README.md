# PowerSync DevTools

`@powersync/diagnostics` shows the live state of your app's [PowerSync](https://powersync.com) client while you develop: sync status, buckets, sync streams, the local database, the schema, and logs. Coding agents get the same data as MCP tools.

One implementation runs in several hosts:

| You have                                              | Use                                                                                                                   | You get                                                                     |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| A Vite app (React, Vue, Svelte, …) with Vite DevTools | `@powersync/diagnostics/vite`                                                                                         | A **PowerSync** dock in Vite DevTools, and MCP tools at `/__devtools/__mcp` |
| A Nuxt app                                            | [`@powersync/nuxt`](https://github.com/powersync-ja/powersync-js/tree/main/packages/nuxt) with `useDiagnostics: true` | A **PowerSync** tab or dock in Nuxt DevTools                                |
| A node app (`@powersync/node`)                        | `@powersync/diagnostics/node`                                                                                         | A DevTools window served by your process, and MCP tools at `/__mcp`         |

The process that runs your app also serves the DevTools window. You start nothing else.

DevTools run in development only. Nothing from this package goes into a production build.

Full guide: [PowerSync DevTools](https://docs.powersync.com/tools/devtools-overview).

## Vite

Install:

```bash
pnpm add -D @powersync/diagnostics @vitejs/devtools
```

Enable Vite DevTools and add the plugin:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import powersyncDevtools from '@powersync/diagnostics/vite';

export default defineConfig({
  // Vite >= 8.3. On Vite 7, spread `...(await DevTools())` from `@vitejs/devtools` into `plugins` instead.
  devtools: true,
  plugins: [powersyncDevtools()]
});
```

To get per-bucket totals in the Buckets tab, enable the core diagnostics stream when you connect:

```ts
await db.connect(connector, { diagnostics: true });
```

Start the dev server and open your app. The first time, Vite DevTools asks you to confirm the browser with a code from your terminal. Then the dock at the bottom of the page shows a **PowerSync** entry.

Vite DevTools also runs during `vite build`. To keep it to the dev server, set `devtools: { apply: 'serve' }`.

Option: `powersyncDevtools({ title: 'PowerSync' })` sets the dock title.

## Node

```ts
import { PowerSyncDatabase } from '@powersync/node';
import { enablePowerSyncDiagnostics } from '@powersync/diagnostics/node';

const db = new PowerSyncDatabase({ schema, database: { dbFilename: 'app.db' } });
await db.connect(connector, { diagnostics: true });

if (process.env.NODE_ENV !== 'production') {
  const devtools = await enablePowerSyncDiagnostics(db);
  console.log(`PowerSync DevTools: ${devtools.signInUrl}`);
}
```

Your process serves the DevTools window on a random free port. Open the printed link. It carries a one-time code, so the browser is trusted at once. The code is valid for five minutes and for one browser; after that, open `devtools.url` and the terminal prints a new link. Set `auth: false` to trust every local browser. MCP tools are at `<url>/__mcp`.

Options: `port` (default: a random free port), `host`, `auth` (default `true`), `open` (open the browser, default `false`), `sdk` and `id` (labels in the UI), `mcp` (see [MCP](#mcp)).

## MCP

Every host exposes the same tools. Names are `powersync_<function>`. Arguments are positional, `arg0` first:

| Tool                     | Arguments                                           | Returns                                                                                      |
| ------------------------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `powersync_sources`      |                                                     | the attached databases (`id`, `sdk`)                                                         |
| `powersync_query`        | `arg0: { sql, params? }`, `arg1: sourceId \| null`  | `{ columns, rows }`, each row an array in column order                                       |
| `powersync_schema`       | `arg0: sourceId \| null`                            | the schema as the SQLite core receives it                                                    |
| `powersync_info`         | `arg0: sourceId \| null`                            | endpoint, token, client id, method, core version                                             |
| `powersync_status`       | `arg0: sourceId \| null`                            | the latest reported sync status                                                              |
| `powersync_upload-queue` | `arg0: sourceId \| null`                            | the latest reported pending uploads: count and size                                          |
| `powersync_action`       | `arg0: { action, args? }`, `arg1: sourceId \| null` | runs reconnect, disconnect, clearData, requestCheckpoint, subscribeStream, unsubscribeStream |

Pass `null` for `sourceId` to use the first attached database.

The endpoint accepts requests with a loopback `Origin` header only. Browsers always send it; some MCP clients do not. To accept requests without it, keep the server on localhost and set:

| Host                       | Where                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| Vite (and Nuxt DevTools 4) | `devtools: { mcp: { allowedOrigins: false } }` in `vite.config.ts` (Vite DevTools' own setting) |
| Node app                   | `enablePowerSyncDiagnostics(db, { mcp: { allowedOrigins: false } })`                            |

The same `mcp` setting takes `false` to turn the endpoint off, or `{ authorization: '<bearer token>' }` to require a token. Example call:

```bash
curl -X POST http://localhost:<port>/__mcp \
  -H 'Origin: http://localhost:<port>' -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"powersync_query","arguments":{"arg0":{"sql":"select count(*) as n from ps_oplog"},"arg1":null}}}'
```

## Requirements

- `@powersync/web >= 2.5` for browser apps, `@powersync/node` for node apps.
- Vite DevTools for the dock: Vite `>= 8.3` with `devtools: true`, or the `@vitejs/devtools` plugin on Vite 7.
- Node `>= 20.16` for the node entry.

## Related packages

These are internal packages used by this package. Your app code does not depend on them.

- [`@powersync/diagnostics-core`](https://github.com/powersync-ja/powersync-js/tree/main/packages/diagnostics-core): the protocol (`SdkIntegration`).
- [`@powersync/diagnostics-ui`](https://github.com/powersync-ja/powersync-js/tree/main/packages/diagnostics-ui): the UI.
