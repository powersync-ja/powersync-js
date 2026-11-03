# PowerSync standalone client

> [!NOTE]
> This package is in an early alpha stage. Its API may change without notice.

This package implements a [PowerSync](https://powersync.com/) client without a SQLite database.
Rows are stored in memory and exposed directly as JavaScript objects. Rather than for direct
consumption in an application, this library is mainly intended as a building block for state
management packages like TanStack DB.

## Comparison to `@powersync/web`

Other PowerSync SDKs store client-side data in SQLite, using either a native SQLite build (`@powersync/node`, `@powersync/react-native`, `@powersync/capacitor` and `@powersync/tauri-plugin`) or a WebAssembly build (`@powersync/web`).

Because code size and load times are especially relevant on the web, shipping around 1MB of WebAssembly modules
and workers for SQLite may not be a good fit for lightweight web applications.

For web apps, this package may be an alternative to `@powersync/web` when all of the following apply:

- You're syncing small data sizes that can be fetched every time the page is opened.
- You don't need offline persistence for local mutations.
- You don't need local multi-tab support (other tabs see mutations after they've been uploaded and synced down again).
- You don't need to run multiple queries in parallel across workers.
- Fast load times and minimal code size is critical.

In these cases, a pure-JavaScript implementation can outperform SQLite compiled to WebAssembly.
On native and mobile platforms, using a SQLite-based PowerSync SDK is still recommended for all apps.

# PowerSync collections for TanStack DB (lite)

`@powersync/tanstack-db-lite` provides [TanStack DB](https://tanstack.com/db) collections
backed by PowerSync [Sync Streams](https://docs.powersync.com/sync/streams/overview).

This package is a small, **online-only** alternative to the full PowerSync SDKs:

- No SQLite, WebAssembly or workers. Synced data lives in memory, in TanStack DB collections.
- Data is downloaded again on every page load, and local writes are not persisted or queued while offline.

Use the [PowerSync Web SDK](https://www.npmjs.com/package/@powersync/web) with the
[official PowerSync collection](https://tanstack.com/db/latest/docs/collections/powersync-collection)
if you need offline support or a local SQL database.

> [!NOTE]
> This package is in an early alpha stage. Its API may change without notice.

## Installation

```bash
npm install @powersync/tanstack-db-lite @tanstack/db
# Additionally, for React:
npm install @tanstack/react-db
```

The package uses recent JavaScript features and targets modern browsers, Node.js and other modern runtimes.
Other runtimes like React Native are not supported without transformations and polyfills.

## Connecting to PowerSync

Create one `PowerSyncClient` for your app. All collections created with the same client share one connection to the
PowerSync Service.

```ts
import { PowerSyncClient } from '@powersync/tanstack-db-lite';

export const powerSync = new PowerSyncClient({
  endpoint: 'https://<your-instance>.powersync.journeyapps.com',
  // Called whenever the client (re)connects. Return a PowerSync JWT for the current user.
  getToken: async (signal) => {
    const response = await fetch('/api/powersync-token', { signal });
    return (await response.json()).token;
  }
});
```

The client connects when the first collection starts syncing, and disconnects when no collection needs it anymore.

## Subscribing to Sync Streams

To subscribe to streams, use `client.acquireStreams()`:

```ts
// Pass the name and parameters of the Stream, along with additional options.
const options: StreamLeaseOptions = {
  // TODO: Consider implementing onError to get notified about errors specific to this Stream
};
const lease = powerSync.acquireStreams([{ name: 'tasks', parameters: { board: 'work' } }], option);
await lease.waitForSync();

// Once the stream is no longer used (once all leases are returned, the client will unsubscribe or disconnect).
lease.release();
```

To observe the sync status, use the `status` getter and `subscribeStatus` to get notified on updates:

```ts
console.log('current sync status', powerSync.status);
const unsubscribe = powerSync.subscribeStatus(() => {
  console.log('updated sync status', powerSync.status);
});

// ...
unsubscribe();
```

You can also import `@powersync/standalone-client/react` for the `usePowerSyncStatus()` hook.

## Reading rows

As the client starts syncing after subscribing to Sync Streams, you can read materialized rows as JavaScript objects.

```ts
for (const [key, data] of powerSync.tableSnapshot('tasks')) {
  console.log('tasks row', key, data);
}
```

To get notified when the snapshot of a table changes, use `listen`:

```ts
const unsubscribe = powerSync.listen('tasks', {
  onChanges(changes) {
    for (const [key, changed] of changes) {
      if (changed == null) {
        console.log('task deleted', key);
      } else {
        console.log('task updated or inserted', key, changed);
      }
    }
  }
});
```

## Local mutations

To ensure consistency, PowerSync buffers pending sync downloads until local mutations have been uploaded and synced.
SQLite-based PowerSync SDKs store pending writes as CRUD entries and keep an internal counter to request a sync
checkpoint after uploading them. The checkpoint is referenced in downloaded data, allowing clients to know when their
writes have synced back down.

For the standalone client, handling mutations depends on the state management library in use. But the process mostly looks like this:

1. Render local mutations as an optimistic overlay over synced changes.
2. Call `markLocalWrite()` to stop the client from applying more changes. You can skip this part if the integration has this check built in (which is the case for Tanstack DB).
3. Upload the local mutation to your backend.
4. Call `confirmWrites()` to request a sync checkpoint.
5. Call `release()` on the value returned by `markLocalWrite()`, allowing the client to resume sync once the checkpoint has been downloaded.
6. Await the promise returned by `confirmWrites` and remove the local overlay.
