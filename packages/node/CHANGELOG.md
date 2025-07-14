# @powersync/node

## 0.7.1

### Patch Changes

- Updated dependencies [9b2bde3]
  - @powersync/common@1.33.2

## 0.7.0

### Minor Changes

- 31e942f: Upgrade undici and use the default undici errors for WebSockets.

### Patch Changes

- ffe3095: Improve websocket keepalive logic to reduce keepalive errors.
- 53236a8: Rust client: Properly upload CRUD entries made while offline.
- d1b7fcb: Rust sync client: Fix reported `lastSyncedAt` values in sync status.
- Updated dependencies [ffe3095]
- Updated dependencies [36d8f28]
- Updated dependencies [53236a8]
- Updated dependencies [b7255b7]
- Updated dependencies [70a9cf5]
- Updated dependencies [d1b7fcb]
  - @powersync/common@1.33.1

## 0.6.0

### Minor Changes

- cbb20c0: This adds a new (and currently experimental) sync client implementation
  implemented natively in the PowerSync SQLite extension.

  This implementation will eventually become the default, but we encourage
  interested users to try it out. In particular, we expect that it can improve
  sync performance (especially on platforms with challenging JS performance,
  like React Native).

  On all our JavaScript SDKs, the new implementation can be enabled with a
  sync option entry when connecting:

  ```JS
  await db.connect(new MyConnector(), {
    clientImplementation: SyncClientImplementation.RUST
  });
  ```

  Since the new client implements the same protocol, you can also migrate back
  to the JavaScript client later by removing the `clientImplementation` option.

  **However**: After enabling the `RUST` client, you cannot downgrade your
  PowerSync SDK below this version. When enabled for the first time, databases
  will be migrated. The JavaScript sync client from this and later SDK versions
  understands the new format, but the client from an older SDK version will not!

### Patch Changes

- 0446f15: Update PowerSync core extension to 0.4.0
- Updated dependencies [cbb20c0]
- Updated dependencies [7e8bb1a]
  - @powersync/common@1.33.0

## 0.5.0

### Minor Changes

- 96ddd5d: Improved behaviour when connect is called multiple times in quick succession. Updating client parameters should now be more responsive.
- efc8ba9: Switch to undici WebSocket for Dispatcher and diagnostics_channel support. This now adds support for the `ALL_PROXY` environment variable by default, as well as `WSS_PROXY` for websocket connections.

### Patch Changes

- Updated dependencies [96ddd5d]
- Updated dependencies [96ddd5d]
- Updated dependencies [efc8ba9]
  - @powersync/common@1.32.0

## 0.4.5

### Patch Changes

- Updated dependencies [b046ebe]
  - @powersync/common@1.31.1

## 0.4.4

### Patch Changes

- 5eae93c: Fix CJS distributables not being published.

## 0.4.3

### Patch Changes

- 2e03dd6: Add a `main` entry to `package.json`. It will be ignored because the package uses conditional exports, but is required for tools like `pkg`.
- 2e03dd6: Support `@powersync/better-sqlite3` versions `0.2.x`.

## 0.4.2

### Patch Changes

- Updated dependencies [0565a0a]
  - @powersync/common@1.31.0

## 0.4.1

### Patch Changes

- Updated dependencies [2949d58]
- Updated dependencies [c30cbef]
  - @powersync/common@1.30.0

## 0.4.0

### Minor Changes

- ed11438: Report progress information about downloaded rows. Sync progress is available through `SyncStatus.downloadProgress`.

### Patch Changes

- 4f68f6a: Update core extension version to 0.3.14
- Updated dependencies [ed11438]
  - @powersync/common@1.29.0

## 0.3.0

### Minor Changes

- f40ecf9: Introduced support for specifying proxy environment variables for the connection methods. For HTTP it supports `HTTP_PROXY` or `HTTPS_PROXY`, and for WebSockets it supports `WS_PROXY` and `WSS_PROXY`.

### Patch Changes

- 6807df6: Using logger types from @powersync/common.
- Updated dependencies [6807df6]
- Updated dependencies [e71dc94]
- Updated dependencies [f40ecf9]
  - @powersync/common@1.28.0

## 0.2.2

### Patch Changes

- Updated dependencies [720ad7a]
  - @powersync/common@1.27.1

## 0.2.1

### Patch Changes

- 1c2ee86: Update README with common installation issues section
- Updated dependencies [b722378]
  - @powersync/common@1.27.0

## 0.2.0

### Minor Changes

- f8fd814: Introduced `executeRaw`, which processes SQLite query results differently to preserve all columns, preventing duplicate column names from being overwritten.

### Patch Changes

- 8c14e99: Include CommonJS distribution for this package.
- 2709a2e: Fix compilation errors on Windows.
- 2709a2e: Provide a more actionable error message when using the `dbLocation` option with a directory that doesn't exist.
- Updated dependencies [f8fd814]
  - @powersync/common@1.26.0

## 0.1.1

### Patch Changes

- 0c8ddda: Update package description
- 2551b40: Update readme to reflect alpha status.
- 7c118b6: Update readme to refer to Node.js docs

## 0.1.0

### Minor Changes

- 12c6649: Initial version
