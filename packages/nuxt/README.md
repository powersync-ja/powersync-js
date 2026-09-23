<div align="center">
  <img src="https://github.com/powersync-ja/powersync-js/raw/main/packages/nuxt/src/runtime/assets/powersync-icon.svg" alt="PowerSync Logo" width="64" height="64" />
  <h1>PowerSync Nuxt</h1>
  <p>PowerSync for Nuxt: offline-first sync with native Nuxt integration</p>
</div>

> [!NOTE]
> The Nuxt package is currently in an **alpha** state, intended strictly for testing. Expect breaking changes and instability as development continues.
>
> Do not rely on this package for production use.

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

PowerSync Nuxt module integrated with the [Nuxt Devtools](https://github.com/nuxt/devtools).

- [Changelog](https://github.com/powersync-ja/powersync-js/blob/main/packages/nuxt/CHANGELOG.md)

## Features

- **Real-time offline-first sync** — PowerSync keeps a local SQLite database in sync with your backend (Postgres, MongoDB, MySQL, or SQL Server). Your app reads from local SQLite and works offline; changes sync automatically when the connection is restored.
- **Auto-imported composables** — `usePowerSync()`, `useQuery()`, and `usePowerSyncKysely()` are available in every component without explicit imports.
- **Built-in diagnostics** — View connection and sync status, inspect sync buckets, streams, and config, and tail real-time logs in the PowerSync tab of Nuxt DevTools.
- **Data inspection** — Browse your local SQLite database in the browser without external tools — useful for verifying what data has synced and debugging data issues during development.
- **Kysely support** — Opt-in type-safe queries via `@powersync/kysely-driver`, enabled with `kysely: true` in your PowerSync config.

## Installation

This module re-exports all `@powersync/vue` composables. With **npm** (v7+), installing `@powersync/nuxt` is enough; with **pnpm**, install peer dependencies explicitly.

```bash
# Using npm
npm install @powersync/nuxt

# Using pnpm (peer deps are not auto-installed)
pnpm add @powersync/nuxt @powersync/vue @powersync/web
```

> [!NOTE]
> This module works with `Nuxt 4` and should work with `Nuxt 3` but has not been tested. Support for Nuxt 2 is not guaranteed or planned.

## Quick Start

For a complete working app, see the [Nuxt + Supabase Todo List demo](https://github.com/powersync-ja/powersync-js/tree/main/demos/nuxt-supabase-todolist). To set up from scratch:

1. Add `@powersync/nuxt` to the `modules` section of `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['@powersync/nuxt'],
  vite: {
    optimizeDeps: {
      exclude: ['@powersync/web']
    },
    worker: {
      format: 'es'
    }
  }
});
```

> [!WARNING]  
> If you are using Tailwind in your project see [Known Issues section](#known-issues)

2. Create a PowerSync plugin (e.g., `plugins/powersync.client.ts`):

```typescript
import { PowerSyncDatabase } from '@powersync/web';
import { createPowerSyncPlugin } from '@powersync/nuxt';
import { AppSchema } from '~/powersync/AppSchema';
import { PowerSyncConnector } from '~/powersync/PowerSyncConnector';

export default defineNuxtPlugin({
  async setup(nuxtApp) {
    const db = new PowerSyncDatabase({
      database: {
        dbFilename: 'your-db-filename.sqlite'
      },
      schema: AppSchema
    });

    const connector = new PowerSyncConnector();

    await db.init();
    await db.connect(connector);

    const plugin = createPowerSyncPlugin({ database: db });
    nuxtApp.vueApp.use(plugin);
  }
});
```

At this point, you're all set to use the module composables. The module automatically exposes all `@powersync/vue` composables, so you can use them directly:

- `usePowerSync()` - Access the PowerSync database instance
- `useQuery()` - Query the database reactively
- And more... (see [API Reference](#api-reference))

## Setting up PowerSync

This guide will walk you through the steps to set up PowerSync in your Nuxt project.

### Create your Schema

Create a file called `AppSchema.ts` and add your schema to it.

```typescript
import { column, Schema, Table } from '@powersync/web';

const lists = new Table({
  created_at: column.text,
  name: column.text,
  owner_id: column.text
});

const todos = new Table(
  {
    list_id: column.text,
    created_at: column.text,
    completed_at: column.text,
    description: column.text,
    created_by: column.text,
    completed_by: column.text,
    completed: column.integer
  },
  { indexes: { list: ['list_id'] } }
);

export const AppSchema = new Schema({
  todos,
  lists
});

// For types
export type Database = (typeof AppSchema)['types'];
export type TodoRecord = Database['todos'];
export type ListRecord = Database['lists'];
```

> **Tip**: Learn more about how to create your schema [here](https://docs.powersync.com/client-sdk-references/javascript-web#1-define-the-schema).

### Create your Connector

Create a file called `PowerSyncConnector.ts` and add your connector to it.

```typescript
import { UpdateType, type PowerSyncBackendConnector } from '@powersync/web';

export class PowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    // Implement fetchCredentials to obtain a JWT from your authentication service.
    // See https://docs.powersync.com/installation/authentication-setup
    // If you're using Supabase or Firebase, you can re-use the JWT from those clients, see
    // - https://docs.powersync.com/installation/authentication-setup/supabase-auth
    // - https://docs.powersync.com/installation/authentication-setup/firebase-auth
    return {
      endpoint: '[Your PowerSync instance URL or self-hosted endpoint]',
      // Use a development token (see Authentication Setup https://docs.powersync.com/installation/authentication-setup/development-tokens) to get up and running quickly
      token: 'An authentication token'
    };
  }

  async uploadData(db: any) {
    // Implement uploadData to send local changes to your backend service.
    // You can omit this method if you only want to sync data from the database to the client

    // See example implementation here: https://docs.powersync.com/client-sdk-references/javascript-web#3-integrate-with-your-backend
    // see demos here: https://github.com/powersync-ja/powersync-js/tree/main/demos
    return;
  }
}
```

> **Tip**: Learn more about how to create your connector [here](https://docs.powersync.com/client-sdk-references/javascript-web#3-integrate-with-your-backend).

### Create your PowerSync Plugin

Finally, putting everything together, create a [plugin](https://nuxt.com/docs/4.x/guide/directory-structure/app/plugins) called `powersync.client.ts` to setup PowerSync.

```typescript
import { PowerSyncDatabase } from '@powersync/web';
import { createPowerSyncPlugin } from '@powersync/nuxt';
import { AppSchema } from '~/powersync/AppSchema';
import { PowerSyncConnector } from '~/powersync/PowerSyncConnector';

export default defineNuxtPlugin({
  async setup(nuxtApp) {
    const db = new PowerSyncDatabase({
      database: {
        dbFilename: 'a-db-name.sqlite'
      },
      schema: AppSchema
    });

    const connector = new PowerSyncConnector();

    await db.init();
    await db.connect(connector);

    const plugin = createPowerSyncPlugin({ database: db });

    nuxtApp.vueApp.use(plugin);
  }
});
```

### Kysely ORM (Optional)

You can use Kysely as your ORM to interact with the database. The module optionally provides a `usePowerSyncKysely()` composable. To keep the bundle small, you must install the driver yourself and enable it in config.

Install the driver:

```
pnpm add @powersync/kysely-driver
```

In your existing `nuxt.config.ts`, set:

```typescript
export default defineNuxtConfig({
  modules: ['@powersync/nuxt'],
  powersync: {
    kysely: true // <- opt-in
  },
  vite: {
    optimizeDeps: {
      exclude: ['@powersync/web']
    },
    worker: {
      format: 'es'
    }
  }
});
```

When enabled, the module exposes `usePowerSyncKysely`. Use your schema’s `Database` type to get proper typings:

```typescript
import { usePowerSyncKysely } from '@powersync/nuxt';
import { type Database } from '../powersync/AppSchema';

// In your component or composable
const db = usePowerSyncKysely<Database>();

// Use the db object to interact with the database
const users = await db.selectFrom('users').selectAll().execute();
```

### Enabling Diagnostics

Diagnostics show the live state of your app's own PowerSync client inside Nuxt DevTools. They run in development only; nothing is added to a production build.

1. **Enable diagnostics in your config**:

```typescript
export default defineNuxtConfig({
  modules: ['@powersync/nuxt'],
  powersync: {
    useDiagnostics: true // <- Add this
  },
  vite: {
    optimizeDeps: {
      exclude: ['@powersync/web']
    },
    worker: {
      format: 'es'
    }
  }
});
```

With `useDiagnostics: true`, the module picks the integration for your Nuxt DevTools version:

- **Nuxt DevTools 3** (what Nuxt 4 ships): the module loads the diagnostics agent into your app during `nuxt dev`, serves the diagnostics UI, and registers a **PowerSync** tab. The UI is served outside your app's router, so route middleware such as an auth guard does not apply to it.
- **Nuxt DevTools 4** (built on Vite DevTools): the module mounts the PowerSync devframe definition. You get a **PowerSync** dock and the MCP tools at `/__devtools/__mcp`, the same as a plain Vite app. The first time, DevTools asks you to confirm the browser with a one-time code printed in your terminal. The MCP endpoint only accepts requests with a loopback `Origin` header; for a client that sends none, set `vite: { devtools: { mcp: { allowedOrigins: false } } }` in `nuxt.config.ts`.

2. **Enable the core diagnostics stream** when you connect. This gives the Buckets tab per-bucket totals:

```typescript
await db.connect(connector, { diagnostics: true });
```

3. **Open Nuxt DevTools** and select the **PowerSync** tab or dock.

## PowerSync Diagnostics

The diagnostics UI helps you inspect and diagnose the state of your PowerSync client from inside your app, in real time.

### Tabs

- **Sync Status** — connection state, sync progress, the upload queue, priority sync, and a "Sync now" checkpoint request.
- **Data Inspector** — a searchable table and view tree, and a SQL console with syntax highlighting.
- **Buckets** — per-bucket downloaded and total operations, size, and a drill-down into a bucket's operations.
- **Streams** — sync stream subscriptions with progress, TTL, and priority, and a subscribe/unsubscribe form.
- **Config** — connection details and the schema as a tree or JSON.
- **Logs** — client logs with a level filter and search.

### How it works

The module uses [`@powersync/diagnostics`](https://github.com/powersync-ja/powersync-js/tree/main/packages/diagnostics). The universal solution used by PowerSync to provide a unified diagnostics experience.

### Migrating from `NuxtPowerSyncDatabase`

Earlier versions shipped a `NuxtPowerSyncDatabase` subclass that enabled diagnostics on connect. It is removed. Use a plain `PowerSyncDatabase` from `@powersync/web` and pass the option yourself:

```diff
- import { NuxtPowerSyncDatabase } from '@powersync/nuxt';
+ import { PowerSyncDatabase } from '@powersync/web';

- const db = new NuxtPowerSyncDatabase({ database: { dbFilename: 'app.sqlite' }, schema: AppSchema });
+ const db = new PowerSyncDatabase({ database: { dbFilename: 'app.sqlite' }, schema: AppSchema });

- await db.connect(connector);
+ await db.connect(connector, { diagnostics: true });
```

The `useDiagnostics: true` module option still controls the DevTools tab and the in-app agent; it is the one switch for the development tooling.

## Development

```bash
# Install dependencies
pnpm install

# Generate type stubs
pnpm run dev:prepare

# Run Vitest
pnpm run test
pnpm run test:watch
```

## Local Testing

If the playground is not enough for you, you can test the module locally by cloning this repo and pointing the nuxt app you want to test to the local module.

Don't forget to add a watcher for the module for hot reloading.

Example (in your nuxt app):

```typescript
import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  modules: ['../../my-location/@powersync/nuxt/src/*'],
  watch: ['../../my-location/@powersync/nuxt/src/*']
});
```

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@powersync/nuxt/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/@powersync/nuxt
[npm-downloads-src]: https://img.shields.io/npm/dm/@powersync/nuxt.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/@powersync/nuxt
[license-src]: https://img.shields.io/npm/l/@powersync/nuxt.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://npmjs.com/package/@powersync/nuxt
[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com
