# @powersync/node

## 0.5.0

### Minor Changes

- 96ddd5d: Improved behaviour when connect is called multiple times in quick succession. Updating client parameters should now be more responsive.

### Patch Changes

- Updated dependencies [96ddd5d]
- Updated dependencies [96ddd5d]
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
