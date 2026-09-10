# PowerSync Diagnostics Protocol

This document specifies the **Diagnostics Protocol**: the message contract that a diagnostics UI uses to inspect a live PowerSync client.

The protocol is language-neutral. This file is the source of truth for every SDK. It does not depend on any SDK type. Each SDK implements the same messages in its own language.

## 1. Overview

Two roles exchange messages:

- **Agent** — runs next to a live PowerSync client, inside the app process. It answers requests and pushes state.
- **Client** — runs in the UI (a DevTools panel, an iframe, or any other host). It sends requests and renders state.

The two roles exchange **messages** that carry plain data only. A message never contains a live database object. This keeps the protocol independent of the transport and the SDK.

```
┌── App process ──────────────┐        ┌── UI host ───────────────┐
│  live client → AGENT        │  ⇄     │  CLIENT → UI              │
└─────────────────────────────┘ msgs   └──────────────────────────┘
                         (any duplex transport)
```

## 2. Transport requirements

The protocol runs over any transport that meets these rules:

1. **Duplex.** Both sides can send and receive.
2. **Message-oriented.** Each send delivers one message.
3. **JSON-serializable.** Each message survives a serialize/deserialize round trip. Send only plain values: strings, numbers, booleans, null, arrays, and plain objects. Do not send class instances, functions, `Map`, `Set`, or binary blobs.
4. **Broadcast-safe.** A transport may deliver one agent's messages to more than one client (see [§8](#8-multiple-clients)). The agent does not need to know how many clients listen.

Proven transports include a same-origin broadcast channel, a browser-extension message bridge, a window message channel, and a VM-service channel. A future transport can be an HTTP or WebSocket channel.

## 3. Message envelope

Every message has a `type` field. Six types exist.

| `type` | Direction | Purpose |
| --- | --- | --- |
| `announce` | both | Presence handshake ([§4](#4-handshake)). |
| `req` | client → agent | A request ([§5](#5-requests)). |
| `res` | agent → client | A response to a request ([§5](#5-requests)). |
| `sub` | client → agent | Subscribe to a push channel ([§7](#7-push-channels)). |
| `unsub` | client → agent | Unsubscribe from a push channel ([§7](#7-push-channels)). |
| `event` | agent → client | A pushed channel payload ([§7](#7-push-channels)). |

## 4. Handshake

Presence is announced, not assumed.

```json
{ "type": "announce", "role": "agent" }
{ "type": "announce", "role": "client" }
```

- The agent sends `announce` with `role: "agent"` when it starts.
- The client sends `announce` with `role: "client"` when it starts.
- When the agent receives a client `announce`, the agent re-announces and **replays** the current state on the push channels. This lets a client that starts after the agent receive the current state at once.

## 5. Requests

A request has a unique `id`, a `method`, and, for some methods, `params`. The agent answers with a `res` that carries the same `id`.

```json
{ "type": "req", "id": "c1:7", "method": "query", "params": { "sql": "SELECT 1" } }
{ "type": "res", "id": "c1:7", "ok": true, "result": { "columns": ["1"], "rows": [{ "1": 1 }], "rowCount": 1 } }
```

A failed request returns `ok: false` and an `error` string:

```json
{ "type": "res", "id": "c1:7", "ok": false, "error": "no such table: foo" }
```

### Methods

| `method` | `params` | `result` |
| --- | --- | --- |
| `query` | `{ sql, params? }` | `QueryResult` ([§6](#6-data-shapes)) |
| `getSchema` | — | `SchemaPayload` ([§6](#6-data-shapes)) |
| `getInfo` | — | `ProtocolInfo` ([§6](#6-data-shapes)) |
| `getUploadQueueStats` | — | `UploadQueueState` ([§6](#6-data-shapes)) |
| `action` | `{ action, args? }` | `{ ok: true }` |

`query` runs read or write SQL against the live client. Because the core's internal `ps_*` tables are identical in every SDK, SQL over the wire is the universal way to read bucket, oplog, and CRUD state.

### Actions

The `action` method runs a control command. The `action` field names the command. Some commands take `args`.

| `action` | `args` | Effect |
| --- | --- | --- |
| `reconnect` | — | Disconnect, then connect again with the last connector. |
| `disconnect` | — | Disconnect the client. |
| `clearData` | — | Clear the local database, then connect again. |
| `requestCheckpoint` | — | Confirm the client is caught up with the service. Needs a client that connects with checkpoint requests enabled. |
| `subscribeStream` | `{ name, params?, ttl?, priority? }` | Subscribe to a sync stream. `ttl` defaults to `0`, so a forgotten debug subscription is evicted when it is released. |
| `unsubscribeStream` | `{ name, params? }` | Release a subscription that was created with `subscribeStream`. |

## 6. Data shapes

All times are **epoch milliseconds**. A value that does not apply is `null`.

### QueryResult

| Field | Type | Notes |
| --- | --- | --- |
| `columns` | string[] | Column names, in order. |
| `rows` | object[] | One object per row, keyed by column name. |
| `rowCount` | integer | Number of rows. |

### ProtocolInfo

Connection metadata for the attached client.

| Field | Type | Notes |
| --- | --- | --- |
| `endpoint` | string \| null | Service endpoint. |
| `userId` | string \| null | Derived from the token subject when the SDK does not expose it. |
| `clientId` | string \| null | The PowerSync client id. |
| `connectionMethod` | string \| null | For example `http` or `websocket`. |
| `params` | object \| null | Client parameters sent on connect. |
| `connected` | boolean | True while connected. |
| `sqliteCoreVersion` | string \| null | Core extension version. |
| `sdk` | string \| null | A label for the host SDK, set by whoever installs the agent. |

### SyncState (channel `status`)

| Field | Type | Notes |
| --- | --- | --- |
| `connected` | boolean | |
| `connecting` | boolean | |
| `downloading` | boolean | |
| `uploading` | boolean | |
| `hasSynced` | boolean \| null | |
| `lastSyncedAt` | integer \| null | |
| `downloadProgress` | `ProgressState` \| null | |
| `priorities` | `PriorityState`[] | Per-priority sync state. |
| `downloadError` | string \| null | |
| `uploadError` | string \| null | |
| `message` | string | A short status message. |

### ProgressState

| Field | Type | Notes |
| --- | --- | --- |
| `downloadedOperations` | integer | |
| `totalOperations` | integer | |
| `downloadedFraction` | number | `0`–`1`. |

### PriorityState

| Field | Type | Notes |
| --- | --- | --- |
| `priority` | integer | |
| `lastSyncedAt` | integer \| null | |
| `hasSynced` | boolean \| null | |

### StreamState (channel `streams`)

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string \| null | Stream name. |
| `priority` | integer \| null | |
| `active` | boolean | True while this stream downloads. |
| `autoSubscribed` | boolean | Included because the stream sets auto-subscribe. |
| `explicitlySubscribed` | boolean | Subscribed at runtime. |
| `progress` | `ProgressState` \| null | |
| `params` | object \| null | Subscription parameters. |
| `expiresAt` | integer \| null | Subscription expiry (TTL). |
| `hasSynced` | boolean | |
| `lastSyncedAt` | integer \| null | |

### BucketState (channel `buckets`)

Per-bucket download stats, read from the core `ps_buckets` table.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Bucket name. |
| `downloadedOperations` | integer | |
| `totalOperations` | integer \| null | Target total. Null unless the core diagnostics stream supplies it. |
| `downloadedSize` | integer \| null | Bytes. Null on cores that do not track size. |
| `lastOp` | string \| null | |
| `downloading` | boolean | |

### UploadQueueState (channel `uploadQueue`)

| Field | Type | Notes |
| --- | --- | --- |
| `count` | integer | Pending upload (CRUD) operations. |
| `size` | integer \| null | Byte size, or null when not computed. |

### LogRecord (channel `logs`)

The agent sends log records as they occur. It does not replay past logs.

| Field | Type | Notes |
| --- | --- | --- |
| `timestamp` | integer | |
| `level` | string | `trace`, `debug`, `info`, `warn`, or `error`. |
| `message` | string | |
| `args` | array (optional) | Extra values, for example an error message. |

### SchemaPayload (`getSchema`)

The schema **as the SQLite core receives it**: the exact JSON payload the client sends to `powersync_replace_schema`. Every SDK already produces this payload, so `getSchema` costs no SDK a second serializer. It carries every table option, column, and index.

```
SchemaPayload {
  tables:     SchemaTable[]
  raw_tables: SchemaRawTable[]   // application-managed tables; diagnostics reads only `name`
}

SchemaTable {
  name
  view_name                      // the effective view name; equals `name` unless overridden
  columns: { name, type }[]
  indexes: { name, columns: { name, ascending, type }[] }[]
  local_only, insert_only, include_metadata, ignore_empty_update: boolean
  include_old: boolean | string[]          // previous-value tracking: on/off, or the tracked column names
  include_old_only_when_changed: boolean
}
```

A UI derives "the view name was overridden" as `view_name != name`.

## 7. Push channels

The agent pushes state as `event` messages. The client rebuilds its own reactive state from this stream. This is the **push bridge**: reactivity is recreated on the client side and is never assumed to cross the boundary.

Five channels exist: `status`, `streams`, `buckets`, `uploadQueue`, and `logs`.

```json
{ "type": "event", "channel": "status", "payload": { "connected": true, "message": "…" } }
```

- The `status` payload is a single `SyncState`.
- The `streams` payload is an array of `StreamState`.
- The `buckets` payload is an array of `BucketState`.
- The `uploadQueue` payload is a single `UploadQueueState`.
- The `logs` payload is an array of `LogRecord`.

A client sends `sub` to ask the agent to replay a channel at once. A client sends `unsub` to stop caring about a channel.

```json
{ "type": "sub", "channel": "buckets" }
{ "type": "unsub", "channel": "buckets" }
```

The agent pushes a channel whenever its source state changes. For example, a status change pushes `status` and `streams`; an internal-table change pushes `buckets`.

## 8. Multiple clients

One agent can serve more than one client at the same time (for example a DevTools tab and an extension panel).

- **Request ids are namespaced per client** (for example `c1:7`), so a response on a shared channel is matched to the client that sent the request. A client ignores a response id that is not in its pending set.
- **Push events are broadcast.** Every listening client receives them.
- **A late client replays state** by sending `announce`, and the agent re-announces and replays the push channels.

## 9. What an SDK agent must provide

To implement the agent, an SDK needs to:

1. Run read and write SQL and return rows (`query`).
2. Return the schema as the core payload it already sends to `powersync_replace_schema` (`getSchema`).
3. Read connection metadata — endpoint, user id, client id, connection method, params (`getInfo`).
4. Read pending upload stats (`getUploadQueueStats`).
5. Observe sync-status changes and push serialized `SyncState` and `StreamState` (`status`, `streams`).
6. Read per-bucket stats from `ps_buckets` and push `BucketState` (`buckets`).
7. Run the control actions ([§5](#5-actions)).
8. Optionally forward log records (`logs`) and per-bucket target totals from the core diagnostics stream.

Every gap is recoverable through SQL against the shared `ps_*` tables, so a new SDK needs only a thin agent. The protocol, the client, and the UI are already done.
