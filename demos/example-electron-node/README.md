# PowerSync + Electron in main process

This example shows how the [PowerSync Node.js client SDK](https://docs.powersync.com/client-sdk-references/node) can be used in the main process of an Electron app.

It uses Electron's built-in `node:sqlite` driver, so `better-sqlite3` and native module rebuilds are not required.

The purpose of this example is to highlight specific build configurations that enable this setup.
In particular:

1. In `src/main/index.ts`, a `PowerSyncDatabase` is created. PowerSync uses node workers to speed up database
   queries. This worker is part of the `@powersync/node` package and wouldn't be copied into the resulting Electron
   app by default. For this reason, this example has its own `src/main/worker.ts` loaded with `new URL('./worker.ts', import.meta.url)`.
   The Webpack configuration recognizes `Worker` imports from `node:worker_threads` so it bundles this worker.
2. In addition to the worker, PowerSync requires access to a SQLite extension providing sync functionality.
   This file is also part of the `@powersync/node` package and is the prebuilt release asset (for example
   `powersync_x64.dll`, `libpowersync_x64.dylib` or `libpowersync_x64.so`) depending on the operating system and
   architecture.
   We use the `copy-webpack-plugin` package to make sure a copy of that file is available to the main process,
   and load it in the custom `src/main/worker.ts`.
3. The `get()` and `getAll()` methods are exposed to the renderer process with an IPC channel.

To see it in action:

1. `cd` into this directory.
2. Run `pnpm install`.
3. Copy `.env.local.template` to `.env.local`, and complete the environment variables. You can generate a [temporary development token](https://docs.powersync.com/usage/installation/authentication-setup/development-tokens), or leave blank to test with local-only data.
   The example works with the schema from the [PowerSync + Supabase tutorial](https://docs.powersync.com/integration-guides/supabase-+-powersync#supabase-powersync).
4. Run `pnpm start`. Without a URL and token, the database runs locally without attempting to sync.

Apart from the build setup, this example is purposefully kept simple.
To make sure PowerSync is working, you can run `await powersync.get('SELECT powersync_rs_version()');` in the DevTools
console. A result from that query implies that the PowerSync was properly configured.

For more details, see the documentation for [the PowerSync node package](https://docs.powersync.com/client-sdk-references/node) and check other examples:

- [example-node](../example-node/): A Node.js CLI example that connects to PowerSync to run auto-updating queries.
- [example-electron](../example-electron/): An Electron example that runs PowerSync in the render process instead of in the main one.
