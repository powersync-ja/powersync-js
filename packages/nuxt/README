<!--
Get your module up and running quickly.

Find and replace all on all files (CMD+SHIFT+F):
- Name: PowerSync Nuxt
- Package name: @powersync/nuxt
- Description: Powersync Nuxt module
-->

<div align="center">
  <img src="https://cdn.prod.website-files.com/67eea61902e19994e7054ea0/67f910109a12edc930f8ffb6_powersync-icon.svg" alt="PowerSync Logo" width="64" height="64" />
  <h1>PowerSync Nuxt</h1>
  <p>Local-first apps made simple</p>
  <p>Effortless offline-first development with PowerSync integration for Nuxt applications.</p>
</div>

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

PowerSync Nuxt module integrated with the [Nuxt Devtools](https://github.com/nuxt/devtools).

- [✨ &nbsp;Release Notes](/CHANGELOG.md)

## Features

- 🔍 **Built-in Diagnostics** - Direct access to PowerSync instance monitoring and real-time connection insights
- 🗄️ **Data Inspection** - Seamless local data browsing with powerful debugging and troubleshooting tools
- ⚡ **Useful Composables** - Ready-to-use Vue composables for rapid offline-first application development
- 📦 **All-in-One** - Exposes all `@powersync/vue` composables, making this the only required dependency

## Installation

This module exposes all `@powersync/vue` composables, so you only need to install `@powersync/nuxt`:

```bash
# Using pnpm
pnpm add -D @powersync/nuxt vite-plugin-top-level-await vite-plugin-wasm

# Using yarn
yarn add --dev @powersync/nuxt vite-plugin-top-level-await vite-plugin-wasm

# Using npm
npm install --save-dev @powersync/nuxt vite-plugin-top-level-await vite-plugin-wasm
```
> [!NOTE]
> This module works with `Nuxt 4` and should work with `Nuxt 3` but has not been tested. Support for Nuxt 2 is not guaranteed or planned.

## Quick Start

1. Add `@powersync/nuxt` to the `modules` section of `nuxt.config.ts`:

```typescript
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineNuxtConfig({
  modules: ['@powersync/nuxt'],
  vite: {
    plugins: [topLevelAwait()],
    optimizeDeps: {
      exclude: ['@journeyapps/wa-sqlite', '@powersync/web'],
      include: ['@powersync/web > js-logger'], // <-- Include `js-logger` when it isn't installed and imported.
    },
    worker: {
      format: 'es',
      plugins: () => [wasm(), topLevelAwait()],
    },
  },
})
```

> [!WARNING]  
> If you are using Tailwind in your project see [Known Issues section](#known-issues)

2. Create a PowerSync plugin (e.g., `plugins/powersync.client.ts`):

```typescript
import { NuxtPowerSyncDatabase } from '@powersync/nuxt'
import { createPowerSyncPlugin } from '@powersync/nuxt'
import { AppSchema } from '~/powersync/AppSchema'
import { PowerSyncConnector } from '~/powersync/PowerSyncConnector'

export default defineNuxtPlugin({
  async setup(nuxtApp) {
    const db = new NuxtPowerSyncDatabase({
      database: {
        dbFilename: 'your-db-filename.sqlite',
      },
      schema: AppSchema,
    })

    const connector = new PowerSyncConnector()

    await db.init()
    await db.connect(connector)

    const plugin = createPowerSyncPlugin({ database: db })
    nuxtApp.vueApp.use(plugin)
  },
})
```

At this point, you're all set to use the module composables. The module automatically exposes all `@powersync/vue` composables, so you can use them directly:

- `usePowerSync()` - Access the PowerSync database instance
- `usePowerSyncQuery()` - Query the database reactively
- `usePowerSyncStatus()` - Monitor sync status
- `usePowerSyncWatchedQuery()` - Watch queries with automatic updates
- And more... (see [API Reference](#api-reference))

## Setting up PowerSync

This guide will walk you through the steps to set up PowerSync in your Nuxt project.

### Create your Schema

Create a file called `AppSchema.ts` and add your schema to it.

```typescript
import { column, Schema, Table } from '@powersync/web'

const lists = new Table({
  created_at: column.text,
  name: column.text,
  owner_id: column.text,
})

const todos = new Table(
  {
    list_id: column.text,
    created_at: column.text,
    completed_at: column.text,
    description: column.text,
    created_by: column.text,
    completed_by: column.text,
    completed: column.integer,
  },
  { indexes: { list: ['list_id'] } },
)

export const AppSchema = new Schema({
  todos,
  lists,
})

// For types
export type Database = (typeof AppSchema)['types']
export type TodoRecord = Database['todos']
export type ListRecord = Database['lists']
```

> **Tip**: Learn more about how to create your schema [here](https://docs.powersync.com/client-sdk-references/javascript-web#1-define-the-schema).

### Create your Connector

Create a file called `PowerSyncConnector.ts` and add your connector to it.

```typescript
import { UpdateType, type PowerSyncBackendConnector } from '@powersync/web'

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
      token: 'An authentication token',
    }
  }

  async uploadData(db: any) {
    // Implement uploadData to send local changes to your backend service.
    // You can omit this method if you only want to sync data from the database to the client

    // See example implementation here: https://docs.powersync.com/client-sdk-references/javascript-web#3-integrate-with-your-backend
    // see demos here: https://github.com/powersync-ja/powersync-js/tree/main/demos
    return
  }
}
```

> **Tip**: Learn more about how to create your connector [here](https://docs.powersync.com/client-sdk-references/javascript-web#3-integrate-with-your-backend).

### Create your PowerSync Plugin

Finally, putting everything together, create a [plugin](https://nuxt.com/docs/4.x/guide/directory-structure/app/plugins) called `powersync.client.ts` to setup PowerSync.

```typescript
import { createPowerSyncPlugin } from '@powersync/nuxt'
import { NuxtPowerSyncDatabase } from '@powersync/nuxt'
import { AppSchema } from '~/powersync/AppSchema'
import { PowerSyncConnector } from '~/powersync/PowerSyncConnector'

export default defineNuxtPlugin({
  async setup(nuxtApp) {
    const db = new NuxtPowerSyncDatabase({
      database: {
        dbFilename: 'a-db-name.sqlite',
      },
      schema: AppSchema,
    })

    const connector = new PowerSyncConnector()

    await db.init()
    await db.connect(connector)

    const plugin = createPowerSyncPlugin({ database: db })

    nuxtApp.vueApp.use(plugin)
  },
})
```

### Kysely ORM (Optional)

You can use Kysely as your ORM to interact with the database. The module provides a `usePowerSyncKysely()` composable:

```typescript
import { usePowerSyncKysely } from '@powersync/nuxt'
import { type Database } from '../powersync/AppSchema'

// In your component or composable
const db = usePowerSyncKysely<Database>()

// Use the db object to interact with the database
const users = await db.selectFrom('users').selectAll().execute()
```

### Enabling Diagnostics

To enable the PowerSync Inspector with diagnostics capabilities:

1. **Enable diagnostics in your config**:

```typescript
export default defineNuxtConfig({
  modules: ['@powersync/nuxt'],
  powersync: {
    useDiagnostics: true, // <- Add this
  },
  vite: {
    plugins: [topLevelAwait()],
    optimizeDeps: {
      exclude: ['@journeyapps/wa-sqlite', '@powersync/web'],
      include: ['@powersync/web > js-logger'],
    },
    worker: {
      format: 'es',
      plugins: () => [wasm(), topLevelAwait()],
    },
  },
})
```

When `useDiagnostics: true` is set, `NuxtPowerSyncDatabase` automatically:
- Sets up diagnostics recording
- Stores the connector internally (accessible via diagnostics)
- Configures logging for diagnostics

2. **Extend your schema**:

If you're using diagnostics, you need to extend your schema with the diagnostics schema to collect diagnostics data:

```typescript
import { usePowerSyncInspector } from '@powersync/nuxt'
import { Schema } from '@powersync/web'

const { diagnosticsSchema } = usePowerSyncInspector()

// Combine with your app schema
const combinedSchema = new Schema([
  ...yourSchema.tables,
  ...diagnosticsSchema.tables,
])
```

3. **Accessing PowerSync Inspector**:

Once diagnostics are enabled, you can access the [PowerSync Inspector](#powersync-inspector):

- **Direct URL**: `http://localhost:3000/__powersync-inspector`
- **Via Nuxt Devtools**: Open Devtools and look for the PowerSync tab (Instable until proper multitab support for diagnostics in implemented)



## PowerSync Inspector

PowerSync Inspector is a tool that helps inspect and diagnose the state of your PowerSync client directly from your app in real-time.

### Setup

To setup the PowerSync inspector, you need to follow the steps in the [Enabling Diagnostics](#enabling-diagnostics) section.

Once setup, the inspector can be accessed on the `http://localhost:3000/__powersync-inspector` route or via the [Nuxt Devtools](#nuxt-devtools).

### Features

#### Sync Status

The `Sync Status` tab provides a real-time view of the sync status of your PowerSync client, including:
- Connection status
- Sync progress
- Upload queue statistics
- Error monitoring

#### Data Inspector

Browse and inspect your local database tables and data with powerful filtering and search capabilities.

#### Config Inspector

View and inspect your PowerSync configuration, connection options, and schema information.

#### Logs

Real-time logging of PowerSync operations with syntax highlighting and search functionality.

#### Nuxt Devtools

The inspector is also available in the Nuxt Devtools as a tab, providing seamless integration with your development workflow.

> [!WARNING]  
> Multitab support is still not fully supported when diagnostics are enabled which causes the inspector to malfunction in the devtool. see [Known Issues section](#known-issues)


## API Reference

### Module Options

#### `useDiagnostics`

Enable diagnostics and the PowerSync Inspector.

- **Type**: `boolean`
- **Default**: `false`
- **Description**: When set to `true`, enables diagnostics recording and makes the PowerSync Inspector available.

```typescript
export default defineNuxtConfig({
  modules: ['@powersync/nuxt'],
  powersync: {
    useDiagnostics: true,
  },
})
```

### PowerSync Vue Composables

This module automatically exposes all composables from `@powersync/vue`, so you don't need to install `@powersync/vue` separately:

- `createPowerSyncPlugin(options)` - Create the PowerSync Vue plugin
- `providePowerSync(database)` - Provide PowerSync database to the app
- `usePowerSync()` - Access the PowerSync database instance
- `usePowerSyncQuery(query, params?)` - Query the database reactively
- `usePowerSyncStatus()` - Monitor sync status
- `usePowerSyncWatchedQuery(query, params?)` - Watch queries with automatic updates
- `useQuery(query, params?)` - Query helper
- `useStatus()` - Status helper
- `useWatchedQuerySubscription(query, params?)` - Watch query subscription helper

All of these composables are available globally in your Nuxt app - no imports needed!

### Classes

#### `NuxtPowerSyncDatabase`

An extended PowerSync database class that includes diagnostic capabilities for use with the PowerSync Inspector.

**Usage**:

```typescript
import { NuxtPowerSyncDatabase } from '@powersync/nuxt'

const db = new NuxtPowerSyncDatabase({
  database: {
    dbFilename: 'your-db-filename.sqlite',
  },
  schema: yourSchema,
})
```

**Features**:

- **Automatic Diagnostics**: When `useDiagnostics: true` is set in module config, automatically enables diagnostics recording
- **Connector Storage**: Stores connector internally for inspector access
- **Enhanced VFS**: Uses cooperative sync VFS for improved compatibility
- **Schema Management**: Integrates with dynamic schema management for inspector features
- **Logging**: Automatically configures logging when diagnostics are enabled

**Note**: The class works with or without diagnostics enabled. When diagnostics are disabled, it behaves like a standard `PowerSyncDatabase`.

### Module Composables

#### `usePowerSyncKysely<T>()`

Provides a Kysely-wrapped PowerSync database for type-safe database queries.

**Type Parameters**:
- `T` - Your database type (from your schema)

**Returns**: Kysely database instance (not `{ db }`)

**Usage**:

```typescript
import { usePowerSyncKysely } from '@powersync/nuxt'
import { type Database } from '../powersync/AppSchema'

// Returns db directly, not { db }
const db = usePowerSyncKysely<Database>()

// Use Kysely query builder
const users = await db.selectFrom('users').selectAll().execute()
```

#### `useDiagnosticsLogger()`

Provides a logger configured for PowerSync diagnostics.

**Returns**:

```typescript
{
  logger: ILogHandler
  logsStorage: Storage
  emitter: Emitter
}
```

**Usage**:

```typescript
const { logger } = useDiagnosticsLogger()

// Logger is automatically configured for diagnostics
// Use it in your PowerSync setup if needed
```


#### `usePowerSyncInspector()`

A composable for setting up PowerSync Inspector functionality. This composable provides utilities for schema management and diagnostics setup.

**Returns**:

```typescript
{
  diagnosticsSchema: Schema
  RecordingStorageAdapter: Class
  getCurrentSchemaManager: Function
}
```

**Properties**:

- **`diagnosticsSchema`** - The schema for diagnostics data collection. Use this to extend your app schema with diagnostic tables.
- **`RecordingStorageAdapter`** - Used internally. Storage adapter class that records operations for diagnostic purposes.
- **`getCurrentSchemaManager()`** - Used internally. Gets the current schema manager instance for dynamic schema operations.

**Usage**:

```typescript
const { diagnosticsSchema } = usePowerSyncInspector()

// Combine with your app schema
const combinedSchema = new Schema([
  ...yourAppSchema.tables,
  ...diagnosticsSchema.tables,
])
```

#### `usePowerSyncInspectorDiagnostics()`

A comprehensive composable that provides real-time diagnostics data and sync status monitoring for your PowerSync client and local database. This composable can be used to create your own inspector.

**Returns**:

```typescript
{
  // Database & Connection
  db: Ref<PowerSyncDatabase>
  connector: ComputedRef<PowerSyncBackendConnector | null>
  connectionOptions: ComputedRef<PowerSyncConnectionOptions | null>
  isDiagnosticSchemaSetup: Readonly<Ref<boolean>>
  
  // Sync Status
  syncStatus: Readonly<Ref<SyncStatus>>
  hasSynced: Readonly<Ref<boolean>>
  isConnected: Readonly<Ref<boolean>>
  isSyncing: Readonly<Ref<boolean>>
  isDownloading: Readonly<Ref<boolean>>
  isUploading: Readonly<Ref<boolean>>
  lastSyncedAt: Readonly<Ref<Date | null>>
  
  // Progress & Statistics
  totalDownloadProgress: Readonly<ComputedRef<string>>
  uploadQueueStats: Readonly<Ref<UploadQueueStats | null>>
  uploadQueueCount: Readonly<ComputedRef<number>>
  uploadQueueSize: Readonly<ComputedRef<string>>
  bucketRows: Readonly<Ref<any[] | null>>
  tableRows: Readonly<Ref<any[] | null>>
  totals: Readonly<ComputedRef<TotalsObject>>
  
  // Error Handling
  downloadError: Readonly<Ref<Error | null>>
  uploadError: Readonly<Ref<Error | null>>
  downloadProgressDetails: Readonly<Ref<DownloadProgress | null>>
  
  // User Info
  userID: Readonly<ComputedRef<string | null>>
  
  // Utilities
  clearData: Function
  formatBytes: Function
}
```

**Reactive Properties**:

- **Connection Status**: `isConnected`, `hasSynced`, `isSyncing`, `isDownloading`, `isUploading`, `lastSyncedAt`
- **Progress Tracking**: `totalDownloadProgress`, `uploadQueueStats`, `uploadQueueCount`, `uploadQueueSize`, `downloadProgressDetails`
- **Data Inspection**: `bucketRows`, `tableRows`, `totals`
- **Error Monitoring**: `downloadError`, `uploadError`
- **Authentication**: `userID`

**Methods**:

- **`clearData()`** - Disconnects and clears all local PowerSync data, then reconnects. Useful for resetting the sync state during development or troubleshooting.
- **`formatBytes(bytes, decimals?)`** - Formats byte counts into readable file sizes (e.g., "1.5 MiB"). Default decimals is 2.

**Usage Examples**:

```vue
<script setup lang="ts">
const {
  isConnected,
  hasSynced,
  isSyncing,
  totalDownloadProgress,
  uploadQueueStats,
  bucketRows,
  totals,
  clearData,
} = usePowerSyncInspectorDiagnostics()
</script>

<template>
  <div>
    <!-- Connection Status -->
    <div v-if="isConnected" class="status-connected">
      Connected {{ hasSynced ? '✅' : '⏳' }}
    </div>
    
    <!-- Sync Progress -->
    <div v-if="isSyncing">
      Syncing... {{ totalDownloadProgress }}%
    </div>
    
    <!-- Statistics -->
    <div v-if="totals">
      <p>Buckets: {{ totals.buckets }}</p>
      <p>Total Rows: {{ totals.row_count }}</p>
      <p>Data Size: {{ totals.data_size }}</p>
    </div>
    
    <!-- Upload Queue -->
    <div v-if="uploadQueueStats">
      Pending uploads: {{ uploadQueueStats.count }}
    </div>
    
    <!-- Debug Actions -->
    <button @click="clearData">Clear Data</button>
  </div>
</template>
```

## Known Issues

1. Enabling diagnostics makes your app glitch when operating in a multi-tab environment. You can observe this issue when you open the inspector in the devtools, for example.

2. PowerSync Inspector relies on `unocss` as a transitive dependency. It might clash with your existing setup, for example if you use Tailwind CSS.

To fix this, you can add the following to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  unocss: {
    icons: true,
    blocklist: [/\$\{.*\}/],
    content: {
      pipeline: {
        exclude: [
          './layouts/*/**',
          './pages/*/**',
          './components/*/**',
          './composables/*/**',
          './utils/*/**',
          './types/*/**',
        ],
      },
    },
  },
})
```

## Development

```bash
# Install dependencies
npm install

# Generate type stubs
npm run dev:prepare

# Develop with playground, with devtools client ui
npm run dev

# Develop with playground, with bundled client ui
npm run play:prod

# Run ESLint
npm run lint

# Run Vitest
npm run test
npm run test:watch

# Release new version
npm run release
```

## Local Testing

If the playground is not enough for you, you can test the module locally by cloning this repo and pointing the nuxt app you want to test to the local module.

Don't forget to add a watcher for the module for hot reloading.

Example (in your nuxt app):

```typescript
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['../../my-location/@powersync/nuxt/src/*'],
  watch: ['../../my-location/@powersync/nuxt/src/*'],
})
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
