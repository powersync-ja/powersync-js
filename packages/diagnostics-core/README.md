# PowerSync Diagnostics — core

This package (`packages/diagnostics-core`) defines the protocol between the [PowerSync](https://powersync.com) diagnostics tool and a PowerSync SDK, and ships the pieces that implement it for JavaScript.

The main entrypoint imports nothing from any PowerSync SDK. The protocol is owned by the tool, and each SDK implements it in its own language. The one exception is the `./web` entrypoint, which opens a real `@powersync/web` database as a headless test client and so imports that SDK; hosts that only inspect an app's own client never load it.

## The protocol in one picture

The contract is one interface, `SdkIntegration`, plus the data shapes it returns and emits.

```
┌── Any host (DevTools dock · Flutter DevTools · window) ──────────┐
│   UI  ──calls──▶  SdkIntegration  ◀──implemented by──  SDK side  │
└──────────────────────────────────────────────────────────────────┘
```

- The **UI** calls `SdkIntegration` methods and renders what comes back.
- Each **SDK** provides one implementation. It reaches the live client with whatever that environment already has.

The tool never carries a wire format of its own. Every method is asynchronous, so the interface can sit directly on an RPC boundary. Request/response correlation, connection and reconnection are the implementation's concern.

The reference definition is the TypeScript itself: [`src/integration.ts`](./src/integration.ts) for the interface and the pushed events, [`src/shapes.ts`](./src/shapes.ts) for every data shape and action. Their doc comments are the specification.

## What is in the package

`@powersync/diagnostics-core`:

- **`SdkIntegration`** and **`DiagnosticsEvent`** — the interface an SDK implements so the diagnostics UI can inspect a live client: run SQL, read the schema and connection info, observe sync state, and run control actions.
- **The data shapes** — `SyncState`, `StreamState`, `BucketState`, `SchemaPayload`, and the rest. Plain JSON, epoch milliseconds, `null` for "does not apply".
- **The iframe bridge** — `exposeIntegration`, `connectIntegration`, `attachIframe`, and `awaitIntegration` move an integration across a `postMessage` boundary with [comlink](https://github.com/GoogleChromeLabs/comlink). The UI always runs in an iframe; the integration lives on the other side.
- **`createDiagnosticsStores`** — reactive stores derived from an integration's events, for the UI. Takes `maxLogs`; the size is exposed as `stores.maxLogs`.
- **`withRequestTimeout`** — wraps an integration so a request whose other side has gone fails with `DiagnosticsRequestTimeoutError` instead of hanging.
- **Shared logic** every host needs on top of the protocol, all working on plain data and SQL results:
  - `readSyncConfigParameters` and `selectSubscribableStreams` — what a deployed Sync Config expects of clients: the connection parameters, and each stream's subscription parameters.
  - `parseStreamBucketName`, `collectStreamStats`, `readStoredSubscriptions` — taking bucket names apart, rolling bucket stats up to the streams that produced them, and reading the core's subscription table.
  - `readTableStats`, `readBucketStats`, `readSyncedTableNames` — rows, operations and size per table and per bucket, over `runQuery`.
  - `collectImpersonationTarget`, `recoverConnectionParams`, `recoverSubscriptions` — what the service logs reveal about one client's session, enough to sync as it did.
  - `ObservedSchema` — a client schema inferred from the columns the core reports (`SchemaChange` events) and from rows already stored, as plain data for a host to apply.
  - `decodeTokenClaims`, `toLogEntry`, `filterLogEntries`, `withAutoLimit` — small helpers for tokens, log display and SQL consoles.

`@powersync/diagnostics-core/js` (JavaScript hosts only):

- **`JsAgent`** — the JavaScript implementation. It runs in the app page next to a live database and reads it through a structural `LiveDatabase` interface, so this package still imports no SDK. The seam is type-checked where a concrete database is passed in, in `@powersync/diagnostics`.
- **`toSyncState`** and **`toStreamStates`** — the mapping from the SDK's sync status to the protocol shapes.
- **`BroadcastCoreEvents`** — the source of the core diagnostics events the JavaScript sync client broadcasts when connected with `diagnostics: true`.

`@powersync/diagnostics-core/web` (web hosts running their own test client; imports `@powersync/web`):

- **`openDiagnosticsSession`** — opens a headless PowerSync client against an instance with a token you hold, and serves it as an `SdkIntegration` in-process, with stores. It reuses one local database across sessions, releases the last session's subscriptions, clears the database when the user or instance changes, and infers and applies a schema as the core reports columns.
- **Storage options** — the VFS (`OPFSCoopSyncVFS` by default; IndexedDB slows down badly on large databases), the file name, the page cache and temporary storage.
- **`session.reset()`**, **`closeAndDeleteDatabase`** and **`deleteDatabaseFiles`** — delete the database's files directly instead of clearing it row by row, which on a large database takes long enough to look like a hang. The first two disconnect and close first: a client still connected when its files go simply downloads everything again.
- **`session.unsubscribeAll`** — the protocol's `unsubscribeStream` with `mode: 'all'`: drops every subscription to a stream so it stops syncing now, where releasing only starts a TTL. `unsubscribeAllStreams` does the same for every runtime subscription.
- **`DevTokenConnector`** — a connector for a token the host already has; it never uploads.

## Who uses it

Most apps do not use this package directly. Use [`@powersync/diagnostics`](https://github.com/powersync-ja/powersync-js/tree/main/packages/diagnostics), which runs the agent and serves the UI for you.

Use this package directly when you build a new host or a new SDK integration.

## Implement the protocol for a new SDK

An implementation needs to:

1. Run read and write SQL and return rows (`runQuery`).
2. Return the core schema payload the client already sends to the core (`getSchema`).
3. Read connection metadata (`getInfo`). Derive `userId` from the token when the SDK has no accessor.
4. Read pending upload stats (`getUploadQueueStats`), through a method or SQL on `ps_crud`.
5. Map the SDK's sync status to `SyncState` and `StreamState`, and push both on every change (`observeEvents`).
6. Read `ps_buckets` and push `BucketState[]` when internal tables change; fold in `target_count` from core events.
7. Run the control actions (`action`).
8. Optionally forward log records and core diagnostics events.

Where the implementation runs is up to the environment. On the web it runs **in the app page**, next to the database, and is bridged to the UI iframe over `postMessage`. In Flutter DevTools it runs **in the DevTools extension**, reaching the app over the VM service, and is bridged to the same UI iframe the same way. The Dart SDK's existing VM-service commands map directly: `select`/`execute` → `runQuery`, `schema` → `getSchema`, `status-listen` → `currentSyncStatus` + `observeEvents`, `list` → `getInfo`.

Then hand the implementation to the UI. On the web this means serving it on a `MessagePort` to the UI iframe:

```ts
import { attachIframe, type SdkIntegration } from '@powersync/diagnostics-core';

const integration: SdkIntegration = createMyIntegration();
const frame = document.querySelector('iframe#diagnostics')!;
const stop = attachIframe(integration, frame);
```

The UI side calls `awaitIntegration()` and receives the port.

## Enablement per SDK

- **JavaScript** — never shipped to production. The integration is loaded only by the development tooling (`@powersync/diagnostics`) when a dev server runs. The SDK carries only what the core needs: the `diagnostics` sync option that switches on the core event stream.
- **Dart** — on by default in debug builds, off in release builds, as the Dart SDK already does.

## Run the JavaScript agent yourself

```ts
import { exposeIntegration } from '@powersync/diagnostics-core';
import { JsAgent } from '@powersync/diagnostics-core/js';

const agent = new JsAgent(db, {
  sdk: '@powersync/web',
  connection: {
    getConnector: () => db.connector,
    getConnectionOptions: () => db.connectionOptions
  }
});

const channel = new MessageChannel();
exposeIntegration(agent, channel.port1);
// Post channel.port2 to the UI iframe.
```
