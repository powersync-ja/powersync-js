# @powersync/op-sqlite

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
