# PowerSync Diagnostics Protocol

This document specifies the contract between the PowerSync diagnostics tool and any PowerSync SDK.

The tool is `diagnostics-core` (the contract and the host-side pieces) plus `diagnostics-ui` (the UI). Neither imports any SDK package. The contract is language-neutral: each SDK implements it in its own language. The TypeScript in `src/shapes.ts` and `src/integration.ts` is the reference definition; this file explains it.

## 1. Overview

The contract is one interface, `SdkIntegration`, plus the data shapes it returns and emits.

```
┌── Any host (DevTools dock · Flutter DevTools · window) ──────────┐
│   UI  ──calls──▶  SdkIntegration  ◀──implemented by──  SDK side  │
└──────────────────────────────────────────────────────────────────┘
```

- The **UI** calls `SdkIntegration` methods and renders what comes back.
- Each **SDK** provides one implementation. It reaches the live client with whatever that environment already has.

The tool never carries a wire format of its own. Request/response correlation, connection and reconnection are the implementation's concern.

## 2. The interface

| Method | Returns | Purpose |
| --- | --- | --- |
| `runQuery({ sql, params? })` | `QueryResult` | Read or write SQL against the live database. |
| `getSchema()` | `SchemaPayload` | The schema as the SQLite core receives it. |
| `getInfo()` | `ProtocolInfo` | Endpoint, user id, client id, connection method, params, core version. |
| `currentSyncStatus()` | `SyncState` | The current sync status. |
| `getUploadQueueStats()` | `UploadQueueState` | Pending upload operations. |
| `observeEvents(handler)` | `Unsubscribe` | Subscribe to pushed state (see [§3](#3-pushed-events)). |
| `action({ action, args? })` | — | Run a control action (see [§4](#4-actions)). |
| `close()` | — | Release listeners, debug subscriptions, and connections. |

`runQuery` is the universal substrate. The core's internal `ps_*` tables are identical in every SDK, so SQL over the interface reads bucket, oplog, and CRUD state the same way everywhere.

## 3. Pushed events

Reactivity does not cross a process or realm boundary on its own. The SDK side therefore **pushes** a fresh serialized snapshot on every change, and the UI rebuilds its own state from that stream. This is the push bridge.

`observeEvents` delivers `DiagnosticsEvent` values:

| `type` | `payload` | When |
| --- | --- | --- |
| `status` | `SyncState` | The sync status changes. |
| `streams` | `StreamState[]` | The sync status changes. |
| `buckets` | `BucketState[]` | An internal table changes, or a core event updates a total. |
| `uploadQueue` | `UploadQueueState` | The sync status or `ps_crud` changes. |
| `logs` | `LogRecord[]` | The SDK logs. Not replayed. |
| `core` | `CoreDiagnosticsEvent` | The SQLite core emits a diagnostics event. |

**Rule:** after a handler subscribes, the implementation emits the current `status`, `streams`, `buckets`, and `uploadQueue` snapshots promptly. A UI that attaches late receives the present state without a separate request.

Snapshots are already mapped to the protocol shapes. The UI never sees an SDK's native status object; each SDK maps its own object onto `SyncState` and `StreamState`.

## 4. Actions

| `action` | `args` | Effect |
| --- | --- | --- |
| `reconnect` | — | Disconnect, then connect again with the last connector. |
| `disconnect` | — | Disconnect the client. |
| `clearData` | — | Clear the local database, then connect again. |
| `requestCheckpoint` | — | Confirm the client is caught up with the service. Needs checkpoint requests enabled on the client. |
| `subscribeStream` | `{ name, params?, ttl?, priority? }` | Subscribe to a sync stream. `ttl` defaults to `0`. |
| `unsubscribeStream` | `{ name, params? }` | Release a subscription created with `subscribeStream`. |

## 5. Data shapes

All times are **epoch milliseconds**. A value that does not apply is `null`. Every shape is plain JSON: strings, numbers, booleans, null, arrays, plain objects.

### QueryResult

| Field | Type | Notes |
| --- | --- | --- |
| `columns` | string[] | Column names, in order. |
| `rows` | object[] | One object per row, keyed by column name. |
| `rowCount` | integer | |

### ProtocolInfo

| Field | Type | Notes |
| --- | --- | --- |
| `endpoint` | string \| null | Service endpoint. |
| `userId` | string \| null | Derive from the token subject when the SDK does not expose it. |
| `clientId` | string \| null | The PowerSync client id. |
| `connectionMethod` | string \| null | For example `http` or `websocket`. |
| `params` | object \| null | Client parameters sent on connect. |
| `connected` | boolean | |
| `sqliteCoreVersion` | string \| null | Core extension version (`SELECT powersync_rs_version()`). |
| `sdk` | string \| null | A label for the SDK behind the integration. |

### SyncState

| Field | Type |
| --- | --- |
| `connected`, `connecting`, `downloading`, `uploading` | boolean |
| `hasSynced` | boolean \| null |
| `lastSyncedAt` | integer \| null |
| `downloadProgress` | `ProgressState` \| null |
| `priorities` | `PriorityState`[] |
| `downloadError`, `uploadError` | string \| null |
| `message` | string |

`ProgressState`: `downloadedOperations`, `totalOperations` (integers), `downloadedFraction` (`0`–`1`).
`PriorityState`: `priority` (integer), `lastSyncedAt` (integer \| null), `hasSynced` (boolean \| null).

### StreamState

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string \| null | |
| `priority` | integer \| null | |
| `active` | boolean | True while downloading. |
| `autoSubscribed` | boolean | The stream sets auto-subscribe. |
| `explicitlySubscribed` | boolean | Subscribed at runtime. |
| `progress` | `ProgressState` \| null | |
| `params` | object \| null | |
| `expiresAt` | integer \| null | Subscription expiry (TTL). |
| `hasSynced` | boolean | |
| `lastSyncedAt` | integer \| null | |

### BucketState

Read from the core `ps_buckets` table.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | |
| `downloadedOperations` | integer | `count_at_last + count_since_last`. |
| `totalOperations` | integer \| null | From the core diagnostics stream (`target_count`); null when off. |
| `downloadedSize` | integer \| null | Bytes; null on cores that do not track it. |
| `lastOp` | string \| null | |
| `downloading` | boolean | |

### UploadQueueState

`count` (integer), `size` (integer \| null). Recoverable in any SDK with SQL against `ps_crud`.

### LogRecord

`timestamp` (integer), `level` (`trace` · `debug` · `info` · `warn` · `error`), `message` (string), `args` (array, optional).

### SchemaPayload

The schema **as the SQLite core receives it**: the exact JSON the client sends to `powersync_replace_schema`. Every SDK already produces this, so `getSchema` costs no SDK a second serializer.

```
SchemaPayload {
  tables:     SchemaTable[]
  raw_tables: SchemaRawTable[]   // application-managed tables; diagnostics reads only `name`
}

SchemaTable {
  name
  view_name                      // effective view name; equals `name` unless overridden
  columns: { name, type }[]
  indexes: { name, columns: { name, ascending, type }[] }[]
  local_only, insert_only, include_metadata, ignore_empty_update: boolean
  include_old: boolean | string[]          // previous-value tracking: on/off, or tracked column names
  include_old_only_when_changed: boolean
}
```

A UI derives "the view name was overridden" as `view_name != name`.

### CoreDiagnosticsEvent

The slice of the SQLite core's diagnostics stream the tool consumes, emitted when the client connects with diagnostics enabled:

```
{ BucketStateChange: { changes: { name, progress: { target_count } }[], incremental? } }
{ SchemaChange: … }
```

## 6. Implementing the interface in an SDK

An implementation needs to:

1. Run read and write SQL and return rows (`runQuery`).
2. Return the core schema payload the client already sends to the core (`getSchema`).
3. Read connection metadata (`getInfo`). Derive `userId` from the token when the SDK has no accessor.
4. Read pending upload stats (`getUploadQueueStats`) — via a method or SQL on `ps_crud`.
5. Map the SDK's sync status to `SyncState` and `StreamState`, and push both on every change (`observeEvents`).
6. Read `ps_buckets` and push `BucketState[]` when internal tables change; fold in `target_count` from core events.
7. Run the control actions (`action`).
8. Optionally forward log records and core diagnostics events.

Where the implementation runs is up to the environment. On the web it runs **in the app page**, next to the database, and is bridged to the UI iframe over `postMessage`. In Flutter DevTools it runs **in the DevTools extension**, reaching the app over the VM service, and is bridged to the same UI iframe the same way. The Dart SDK's existing VM-service commands map directly: `select`/`execute` → `runQuery`, `schema` → `getSchema`, `status-listen` → `currentSyncStatus` + `observeEvents`, `list` → `getInfo`.

## 7. Enablement

Per SDK:

- **JavaScript** — never shipped to production. The integration is injected only by the development tooling (the Vite plugin) when a dev server runs. The SDK carries only what the core needs: the `diagnostics` sync option that switches on the core event stream.
- **Dart** — on by default in debug builds, off in release builds, as the Dart SDK already does.
