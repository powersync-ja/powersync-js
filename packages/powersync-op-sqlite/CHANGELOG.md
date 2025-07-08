# @powersync/op-sqlite

## 0.7.3

### Patch Changes

- Updated dependencies [9b2bde3]
  - @powersync/common@1.33.2

## 0.7.2

### Patch Changes

- ffe3095: Improve websocket keepalive logic to reduce keepalive errors.
- 6ebaabe: Fixed an issue where the default `op-sqlite` database location determination logic was being overridden. The `dbLocation` is now only applied when explicitly provided, resolving issues with features like iOS App Groups.
- Updated dependencies [ffe3095]
- Updated dependencies [36d8f28]
- Updated dependencies [53236a8]
- Updated dependencies [b7255b7]
- Updated dependencies [70a9cf5]
- Updated dependencies [d1b7fcb]
  - @powersync/common@1.33.1

## 0.7.1

### Patch Changes

- 0446f15: Update PowerSync core extension to 0.4.0
- Updated dependencies [cbb20c0]
- Updated dependencies [7e8bb1a]
  - @powersync/common@1.33.0

## 0.7.0

### Minor Changes

- ddc0bd1: Updated op-sqlite upstream peer dependency from 11.x.x to support ^13.x.x and ^14.x.x,

  Noteworthy changes from version 11 to version 14 include:

  1. SQLite updated to 3.49.1
  2. SQLCipher updated to 4.8.0
  3. Monorepo config resolution, you may need to move your `op-sqlite` config from your application's `package.json` to the monorepo root `package.json` depending on where your package manager tool hoists modules (see [1](https://op-engineering.github.io/op-sqlite/docs/installation) and [2](https://github.com/OP-Engineering/op-sqlite/issues/264)).

### Patch Changes

- Updated dependencies [96ddd5d]
- Updated dependencies [96ddd5d]
- Updated dependencies [efc8ba9]
  - @powersync/common@1.32.0

## 0.6.1

### Patch Changes

- Updated dependencies [b046ebe]
  - @powersync/common@1.31.1

## 0.6.0

### Minor Changes

- 1037e8a: `close()` is now async, which allows clients to use it with `await`.

### Patch Changes

- 1037e8a: Rejecting pending read/write operations when the database is closed.

## 0.5.6

### Patch Changes

- d58b4fc: Promoting package to Beta release.
- Updated dependencies [0565a0a]
  - @powersync/common@1.31.0

## 0.5.5

### Patch Changes

- Updated dependencies [2949d58]
- Updated dependencies [c30cbef]
  - @powersync/common@1.30.0

## 0.5.4

### Patch Changes

- 4f68f6a: Update core extension version to 0.3.14
- Updated dependencies [ed11438]
  - @powersync/common@1.29.0

## 0.5.3

### Patch Changes

- Updated dependencies [6807df6]
- Updated dependencies [e71dc94]
- Updated dependencies [f40ecf9]
  - @powersync/common@1.28.0

## 0.5.2

### Patch Changes

- Updated dependencies [720ad7a]
  - @powersync/common@1.27.1

## 0.5.1

### Patch Changes

- Updated dependencies [b722378]
  - @powersync/common@1.27.0

## 0.5.0

### Minor Changes

- f8fd814: Introduced `executeRaw`, which processes SQLite query results differently to preserve all columns, preventing duplicate column names from being overwritten.

### Patch Changes

- Updated dependencies [f8fd814]
  - @powersync/common@1.26.0

## 0.4.1

### Patch Changes

- 17fc01e: Update core PowerSync SQLite extensions to 0.3.12
- Updated dependencies [76dfb06]
- Updated dependencies [3c595af]
- Updated dependencies [fe98172]
- Updated dependencies [85f0228]
  - @powersync/common@1.25.0

## 0.4.0

### Minor Changes

- 56185bb: Default to using memory for temp store, and 50MB cache size.

### Patch Changes

- Updated dependencies [893d42b]
- Updated dependencies [0606ac2]
  - @powersync/common@1.24.0

## 0.3.1

### Patch Changes

- a4895cc: Silencing transactions that are reporting on failed rollback exceptions when they are safe to ignore.
- Updated dependencies [0f28fb3]
  - @powersync/common@1.23.0

## 0.3.0

### Minor Changes

- 3a37054: \* Allow users to load additional sqlite extensions
  - Remove `getBundledPath` function as `getDylibPath` can now be used instead

## 0.2.1

### Patch Changes

- b38bcdb: Update op-sqlite to v11.2.13.
- 2c86114: Update powersync-sqlite-core to 0.3.8 - Increase limit on number of columns per table to 1999.
- Updated dependencies [2c86114]
  - @powersync/common@1.22.2

## 0.2.0

### Minor Changes

- 181a9db: Fixed single write transaction operations in `ps_crud` not being processed. Batching update notifications per write lock.
  This will also fix downstream features such as watched queries and reactive query hooks in cases where the query is fired before the data was committed, and batching will improve performance specifically in cases where a lot of data changes occur.

## 0.1.4

### Patch Changes

- Updated dependencies [7a47778]
- Updated dependencies [4a262cd]
  - @powersync/common@1.22.1

## 0.1.3

### Patch Changes

- Updated dependencies [77a9ed2]
  - @powersync/common@1.22.0

## 0.1.2

### Patch Changes

- 7c9c41d: Update op-sqlite to v10.1.0 for compatibility with React Native >0.76

## 0.1.1

### Patch Changes

- c146e3d: Update powersync-sqlite-core to 0.3.6 to fix issue with dangling rows

## 0.1.0

### Minor Changes

- 7b49661: Added `refreshSchema()` which will cause all connections to be aware of a schema change.

### Patch Changes

- Updated dependencies [7b49661]
  - @powersync/common@1.21.0

## 0.0.7

### Patch Changes

- Updated dependencies [96f1a87]
  - @powersync/common@1.20.2

## 0.0.6

### Patch Changes

- 2b614bc: Improved queueing for read connections

## 0.0.5

### Patch Changes

- Updated dependencies [79d4211]
  - @powersync/common@1.20.1

## 0.0.4

### Patch Changes

- 070454a: Encryption for databases using SQLCipher.

## 0.0.3

### Patch Changes

- c9145d3: Fixes bundled dependencies and code generation.

## 0.0.2

### Patch Changes

- ceb5157: Use powersync-sqlite-core 0.3.0
- 40b2d29: Build generated lib files before release.
- Updated dependencies [77e196d]
  - @powersync/common@1.20.0

## 0.0.1

### Patch Changes

- 9c140b5: Initial Alpha version.
