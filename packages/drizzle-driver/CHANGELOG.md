# @powersync/drizzle-driver

## 0.3.2

### Patch Changes

- 6580f29: Added support for custom column types when converting a Drizzle schema to a PowerSync app schema.

## 0.3.1

### Patch Changes

- 86a753f: Fixed Drizzle transactions breaking for react-native projects, correctly using lock context for transactions.

## 0.3.0

### Minor Changes

- a547fc6: Added support for column "mode" option. This allows the ORM to expose values as complex types such as JSON and Timestamp, but store them as primitives such as text and integer.
- 53fd64e: Added support for casing option in the Drizzle schema helper functions.

### Patch Changes

- ed5bb49: Fixed a typing issue related to queries returning multiple results when used in `db.watch()`.

## 0.2.0

### Minor Changes

- 77a9ed2: Added `watch()` function to Drizzle wrapper to support watched queries. This function invokes `execute()` on the Drizzle query which improves support for complex queries such as those which are relational.
- 4a70624: Added helper `toPowersyncTable` function and `DrizzleAppSchema` constructor to convert a Drizzle schema into a PowerSync app schema.

### Patch Changes

- Updated dependencies [77a9ed2]
  - @powersync/common@1.22.0

## 0.1.0

### Minor Changes

- 9c19e4c: Added support for casing option.
- 9d66bdc: Changed drizzle-orm to a peer dependency, supporting a wider set of versions in downstream projects.

### Patch Changes

- 4c2a5c3: Added PowerSyncSQLiteDatabase type as part of exported members.

## 0.0.1

### Patch Changes

- b8e1848: Initial Alpha version.
