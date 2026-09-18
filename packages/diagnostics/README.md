# PowerSync DevTools

This package (`@powersync/diagnostics`) gives you a live view of your app's own [PowerSync](https://powersync.com) client while you develop: sync status, buckets, sync streams, the local database, the schema, and logs. The same functions are exposed to coding agents as MCP tools.

It is a [devframe](https://devfra.me) definition, so one implementation mounts in several places:

| You have                                              | Use                                                                                                                   | You get                                                                     |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| A Vite app (React, Vue, Svelte, …) with Vite DevTools | `@powersync/diagnostics/vite`                                                                                         | A **PowerSync** dock in Vite DevTools, and MCP tools at `/__devtools/__mcp` |
| A Nuxt app                                            | [`@powersync/nuxt`](https://github.com/powersync-ja/powersync-js/tree/main/packages/nuxt) with `useDiagnostics: true` | A **PowerSync** tab or dock in Nuxt DevTools                                |
| A node app (`@powersync/node`)                        | `@powersync/diagnostics/node`                                                                                         | A DevTools window served by your process, and MCP tools at `/__mcp`         |
| Anything else with `fetch` and `WebSocket`            | the `powersync-devtools` CLI + `@powersync/diagnostics/agent`                                                         | A DevTools window on your machine that the app attaches to                  |

Everything runs in development only. Nothing from this package reaches a production build.

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
  // Vite >= 8.3. On Vite 7, add the `DevTools()` plugin from `@vitejs/devtools` instead.
  devtools: true,
  plugins: [powersyncDevtools()]
});
```

Enable the core diagnostics stream when you connect. This gives the Buckets tab per-bucket totals:

```ts
await db.connect(connector, { diagnostics: true });
```

Start the dev server and open your app. The first time, Vite DevTools asks you to confirm the browser with a one-time code printed in your terminal. Then the dock at the bottom of the page shows a **PowerSync** entry.

How it works: the plugin mounts the definition into Vite DevTools. The dock runs a small script inside your app page that finds the open PowerSync database and serves it to the dev server. The diagnostics UI, in the dock's iframe, and any MCP client talk to the dev server, which forwards to the page. So an MCP call reaches your database only while a trusted browser tab has the app open.

Options:

```ts
powersyncDevtools({ title: 'PowerSync' }); // the dock title
```

## Node

```ts
import { PowerSyncDatabase } from '@powersync/node';
import { enablePowerSyncDiagnostics } from '@powersync/diagnostics/node';

const db = new PowerSyncDatabase({ schema, database: { dbFilename: 'app.db' } });
await db.connect(connector, { diagnostics: true });

if (process.env.NODE_ENV !== 'production') {
  const devtools = await enablePowerSyncDiagnostics(db, { port: 9999 });
  console.log(`PowerSync DevTools: ${devtools.url}`);
}
```

Your process serves the DevTools window at that port. The browser confirms itself with a one-time code printed in your terminal; pass `auth: false` to trust every local browser. MCP tools are at `<url>/__mcp`.

Options: `port` (default 9999), `host`, `auth` (default `true`), `open` (open the browser, default `false`), `sdk` and `id` (labels shown in the UI), `mcp` (the MCP endpoint, see [MCP](#mcp)).

## The CLI and remote apps

```bash
npx powersync-devtools                 # a DevTools window on http://localhost:9999
npx powersync-devtools --no-auth       # trust every local browser
npx powersync-devtools --mcp-any-origin # accept MCP requests that carry no Origin header
npx powersync-devtools mcp             # the same tools as a stdio MCP server
```

The window waits for a database to attach. An app attaches with `connectAgent`, from any JavaScript runtime that has `fetch` and `WebSocket`:

```ts
import { connectAgent } from '@powersync/diagnostics/agent';

const stop = await connectAgent(db, {
  baseURL: 'http://localhost:9999/',
  authToken: process.env.POWERSYNC_DEVTOOLS_TOKEN, // a token the server trusts, or start it with --no-auth
  sdk: '@powersync/react-native'
});
```

This is the path for React Native and for any host without a DevTools dock. It is untested outside the browser and node so far.

## MCP

Every host exposes the same tools. Names are `powersync_<function>`; arguments are positional, `arg0` first:

| Tool                     | Arguments                                           | Returns                                                                                      |
| ------------------------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `powersync_sources`      |                                                     | the attached databases (`id`, `sdk`)                                                         |
| `powersync_query`        | `arg0: { sql, params? }`, `arg1: sourceId \| null`  | `{ columns, rows, rowCount }`                                                                |
| `powersync_schema`       | `arg0: sourceId \| null`                            | the schema as the SQLite core receives it                                                    |
| `powersync_info`         | `arg0: sourceId \| null`                            | endpoint, user id, client id, method, core version                                           |
| `powersync_status`       | `arg0: sourceId \| null`                            | the current sync status                                                                      |
| `powersync_upload-queue` | `arg0: sourceId \| null`                            | pending uploads: count and size                                                              |
| `powersync_action`       | `arg0: { action, args? }`, `arg1: sourceId \| null` | runs reconnect, disconnect, clearData, requestCheckpoint, subscribeStream, unsubscribeStream |

Pass `null` for `sourceId` to use the first attached database.

The Streamable HTTP endpoint accepts requests with a loopback `Origin` header; a request without one gets `403`. Browsers always send the header, some MCP clients do not. The check belongs to whoever hosts the endpoint, so it is turned off in a different place per host, and the server should then stay bound to localhost:

| Host                       | Where                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| Vite (and Nuxt DevTools 4) | `devtools: { mcp: { allowedOrigins: false } }` in `vite.config.ts` (Vite DevTools' own setting) |
| Node app                   | `enablePowerSyncDiagnostics(db, { mcp: { allowedOrigins: false } })`                            |
| CLI                        | `powersync-devtools --mcp-any-origin`                                                           |

The same `mcp` setting takes `false` to leave the endpoint off, or `{ authorization: '<bearer token>' }` to require a token instead. Example call:

```bash
curl -X POST http://localhost:9999/__mcp \
  -H 'Origin: http://localhost:9999' -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"powersync_query","arguments":{"arg0":{"sql":"select count(*) as n from ps_oplog"},"arg1":null}}}'
```

## Entrypoints

| Entry                      | Runs in            | Contents                                                                                                        |
| -------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `@powersync/diagnostics`   | node               | `definition`, the devframe definition; `registerIntegration` to serve an `SdkIntegration` from the same process |
| `./vite`                   | node (Vite config) | `powersyncDevtools()`, the Vite DevTools plugin                                                                 |
| `./node`                   | node app           | `enablePowerSyncDiagnostics(db, options)`                                                                       |
| `./agent`                  | any JS runtime     | `createIntegration(db, sdk)`, `createAgentServer(rpc)`, `connectAgent(db, options)`                             |
| `./client`                 | the app page       | the dock client script for `@powersync/web` apps (loaded by the dock, not by you)                               |
| `./page`                   | the app page       | the `postMessage` agent for hosts without a devframe hub (used by `@powersync/nuxt` on Nuxt DevTools 3)         |
| `./vite-static`            | node (Vite config) | serves the UI at `/__powersync/` from a plain Vite dev server, for hosts that embed it in their own iframe      |
| `powersync-devtools` (bin) | shell              | the standalone window and the stdio MCP server                                                                  |

## Requirements

- `@powersync/web >= 2.2` for browser apps, `@powersync/node` for node apps.
- Vite DevTools for the dock: Vite `>= 8.3` with `devtools: true`, or the `@vitejs/devtools` plugin on Vite 7.
- Node `>= 20` for the node entry and the CLI.

## Related packages

- [`@powersync/diagnostics-core`](https://github.com/powersync-ja/powersync-js/tree/main/packages/diagnostics-core) — the protocol (`SdkIntegration`) and the JavaScript agent this package serves.
- [`@powersync/diagnostics-ui`](https://github.com/powersync-ja/powersync-js/tree/main/packages/diagnostics-ui) — the UI this package serves.
