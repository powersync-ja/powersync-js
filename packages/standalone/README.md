# PowerSync standalone client

> [!NOTE]
> This package is in an early alpha stage. Its API may change without notice.

This package implements a [PowerSync](https://powersync.com/) client without a SQLite database.
Rows are stored in memory and exposed directly as JavaScript objects. This library is mainly intended
as a building block for state management packages like TanStack DB.

## Comparison to `@powersync/web`

Other PowerSync SDKs store client-side data in SQLite, using either a native SQLite build (`@powersync/node`, `@powersync/react-native`, `@powersync/capacitor` and `@powersync/tauri-plugin`) or a WebAssembly build (`@powersync/web`).

Because code size and load times are especially relevant on the web, shipping around 1MB of WebAssembly modules
and workers for SQLite may not be a good fit for lightweight web applications.

For web apps, this package may be an alternative to `@powersync/web` when all of the following apply:

- You're syncing small data sizes that can be fetched on every load.
- You don't need offline persistence for local mutations.
- You don't need local multi-tab support (other tabs see mutations after they've been uploaded and synced down again).
- You don't need to run multiple queries in parallel across workers.
- Fast load times and reducing code size is critical.

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

## Defining collections

Each collection holds the rows of one PowerSync table. Use `streams` to choose which
[Sync Streams](https://docs.powersync.com/sync/streams/overview) to subscribe to while the collection is in use:

```ts
import { createCollection } from '@tanstack/db';
import { powerSyncCollectionOptions } from '@powersync/tanstack-db-lite';
import { z } from 'zod';

const Todo = z.object({
  id: z.string(),
  list_id: z.string(),
  description: z.string(),
  completed: z.coerce.boolean()
});
type Todo = z.infer<typeof Todo>;

export const todos = createCollection(
  powerSyncCollectionOptions<Todo>({
    client: powerSync,
    table: 'todos',
    streams: [{ name: 'user_todos' }],
    // Converts synced JSON rows into your application type.
    parse: (row) => Todo.parse(row)
  })
);
```

`parse` receives each synced row, including its `id`. It must return a value with the same `id`. Use it to validate rows
and convert values, for example to turn integers into booleans or ISO strings into dates.

Streams can take [parameters](https://docs.powersync.com/sync/streams/parameters), and an optional [priority override](https://docs.powersync.com/sync/streams/client-usage#priority-override):

```ts
streams: [{ name: 'list_todos', parameters: { list_id: listId }, priority: 1 }];
```

A collection includes **all** synced rows of its table, whichever collection requested the stream they came from. A
collection that only displays rows synced through other collections can leave `streams` empty. Filtering happens in
your queries.

## Querying

Collections work with all TanStack DB query APIs. In React:

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';

function TodoList({ listId }: { listId: string }) {
  const { data, isLoading } = useLiveQuery(
    (q) =>
      q
        .from({ todo: todos })
        .where(({ todo }) => eq(todo.list_id, listId))
        .orderBy(({ todo }) => todo.description),
    [listId]
  );

  if (isLoading) return <p>Loading…</p>;
  return (
    <ul>
      {data.map((todo) => (
        <li key={todo.id}>{todo.description}</li>
      ))}
    </ul>
  );
}
```

A collection becomes ready once the PowerSync Service has sent a complete, consistent snapshot of its streams. Updates
are then applied as they arrive.

## Syncing data on demand

For large datasets, you can subscribe to streams only for data that live queries actually need. Pass `getSubscriptions`
instead of `streams`. TanStack DB calls it with each query's filters, and the subscription lasts as long as the query
is active:

```ts
import { createCollection, parseLoadSubsetOptions } from '@tanstack/db';

export const todos = createCollection(
  powerSyncCollectionOptions<Todo>({
    client: powerSync,
    table: 'todos',
    parse: (row) => Todo.parse(row),
    getSubscriptions: (options) => {
      const { filters } = parseLoadSubsetOptions(options);
      const list = filters.find((f) => f.field.join('.') === 'list_id' && f.operator === 'eq');
      return list ? [{ name: 'list_todos', parameters: { list_id: list.value } }] : [];
    }
  })
);
```

A live query on an on-demand collection is ready once the streams it requested have synced. Queries using the same
stream and parameters share one subscription.

## Writing data

PowerSync syncs data from your backend database to clients. Writes are your responsibility: Tanstack DB applies
them optimistically, and calls your mutation handlers to upload them to your backend. After your backend has
committed a write to the source database, call `confirmWrites()`.
It waits until PowerSync has synced the change back, so the optimistic state is replaced with
confirmed data without flickering:

```ts
export const todos = createCollection(
  powerSyncCollectionOptions<Todo>({
    client: powerSync,
    table: 'todos',
    streams: [{ name: 'user_todos' }],
    parse: (row) => Todo.parse(row),
    onInsert: async ({ transaction, collection }) => {
      await api.createTodos(transaction.mutations.map((m) => m.modified));
      await collection.utils.confirmWrites();
    },
    onUpdate: async ({ transaction, collection }) => {
      await api.updateTodos(transaction.mutations.map((m) => ({ id: m.key, ...m.changes })));
      await collection.utils.confirmWrites();
    },
    onDelete: async ({ transaction, collection }) => {
      await api.deleteTodos(transaction.mutations.map((m) => m.key));
      await collection.utils.confirmWrites();
    }
  })
);

// Then, anywhere in your app:
todos.insert({ id: crypto.randomUUID(), list_id: listId, description: 'Buy milk', completed: false });
```

`confirmWrites()` is also available as `powerSync.confirmWrites()`. Both accept an `AbortSignal` to stop waiting:
`confirmWrites({ signal: AbortSignal.timeout(10_000) })`.

## Connection status

`powerSync.status` describes the connection. Its `state` is one of `idle`, `connecting`, `syncing`, `ready` or
`retrying`, and `error` holds the last error while retrying. In React, use `usePowerSyncStatus`:

```tsx
import { usePowerSyncStatus } from '@powersync/tanstack-db-lite/react';

function ConnectionIndicator() {
  const status = usePowerSyncStatus(powerSync);
  return status.state === 'retrying' ? <p>Reconnecting… ({status.error?.message})</p> : null;
}
```

The status describes the connection, not whether a collection has usable data. Use TanStack DB's readiness flags, such
as `isLoading` from `useLiveQuery`, for that.

## Errors

- If the PowerSync Service rejects a stream subscription, for example because of invalid parameters, the affected
  collection receives a `StreamError` through its `onError` option. Its `stream` and `messages` fields describe the
  problem. A collection whose stream fails before it becomes ready moves to TanStack DB's error state. An on-demand
  query depending on the stream fails to load.
- Connection errors are reported through `onError` as well, and the client keeps retrying with exponential backoff.
- Errors thrown by `parse` are reported through `onError`, and the affected rows are skipped.

```ts
powerSyncCollectionOptions<Todo>({
  // ...
  onError: (error) => {
    if (error instanceof StreamError) console.error(`Stream ${error.stream.name} failed`, error.messages);
  }
});
```
