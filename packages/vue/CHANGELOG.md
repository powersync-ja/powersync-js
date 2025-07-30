# @powersync/vue

## 0.3.0

### Minor Changes

- c7d2b53: [Potentially breaking change] The `useQuery` hook results are now explicitly defined as readonly. These values should not be mutated.

  - Added the ability to limit re-renders by specifying a `rowComparator` for query results. The `useQuery` hook will only emit `data` changes when the data has changed.

  ```javascript
  // The data here will maintain previous object references for unchanged items.
  const { data } = useQuery('SELECT * FROM lists WHERE name = ?', ['aname'], {
    rowComparator: {
      keyBy: (item) => item.id,
      compareBy: (item) => JSON.stringify(item)
    }
  });
  ```

  - Added the ability to subscribe to an existing instance of a `WatchedQuery`

  ```vue
  <script setup>
  import { useWatchedQuerySubscription } from '@powersync/vue';

  const listsQuery = powerSync
    .query({
      sql: `SELECT * FROM lists`
    })
    .differentialWatch();

  const { data, isLoading, isFetching, error } = useWatchedQuerySubscription(listsQuery);
  </script>

  <template>
    <div v-if="isLoading">Loading...</div>
    <div v-else-if="isFetching">Updating results...</div>

    <div v-if="error">{{ error }}</div>
    <ul v-else>
      <li v-for="l in data" :key="l.id">{{ l.name }}</li>
    </ul>
  </template>
  ```

- c7d2b53: - [Internal] Updated implementation to use shared `WatchedQuery` implementation.

### Patch Changes

- Updated dependencies [319012e]
- Updated dependencies [c7d2b53]
- Updated dependencies [6b38551]
- Updated dependencies [a1abb15]
  - @powersync/common@1.35.0

## 0.2.4

### Patch Changes

- 6807df6: Using newly exposed logger from AbstractPowerSyncDatabase to have controlled logging instead of using console based logging.
- Updated dependencies [6807df6]
- Updated dependencies [e71dc94]
- Updated dependencies [f40ecf9]
  - @powersync/common@1.28.0

## 0.2.3

### Patch Changes

- 7b49661: Queries will recalculate dependent tables if schema is updated.
- Updated dependencies [7b49661]
  - @powersync/common@1.21.0

## 0.2.2

### Patch Changes

- 245bef5: Ensuring sourcemaps are not included for packages.
- Updated dependencies [944ee93]
- Updated dependencies [245bef5]
  - @powersync/common@1.18.1

## 0.2.1

### Patch Changes

- c04ecfc: React and Vue helpers should execute queries from compatible query executor methods. This should allow Kysely queries with plugins to function correctly.
- Updated dependencies [447f979]
- Updated dependencies [b1a76b3]
- Updated dependencies [e77b1ab]
- Updated dependencies [447f979]
- Updated dependencies [f202944]
- Updated dependencies [447f979]
- Updated dependencies [447f979]
- Updated dependencies [447f979]
- Updated dependencies [447f979]
  - @powersync/common@1.17.0

## 0.2.0

### Minor Changes

- 02ae5de: Prebundling dependencies with the aim of reducing the need for polyfills.

### Patch Changes

- Updated dependencies [32e342a]
- Updated dependencies [02ae5de]
  - @powersync/common@1.15.0

## 0.1.10

### Patch Changes

- 843cfec: revert peer dep change
- Updated dependencies [05f3dbd]
  - @powersync/common@1.14.0

## 0.1.9

### Patch Changes

- Updated dependencies [44c568b]
  - @powersync/common@1.13.1

## 0.1.8

### Patch Changes

- 31c61b9: Change @powersync/common peerDep to ^

## 0.1.7

### Patch Changes

- 86cfa71: Fixed comlink issue caused when using reactive sql parameters.

## 0.1.6

### Patch Changes

- 4463851: Moved Vue package to beta.
- Updated dependencies [32dc7e3]
  - @powersync/common@1.10.0

## 0.1.5

### Patch Changes

- 48cc01c: Reinclude common package as a dependency

## 0.1.4

### Patch Changes

- 6b01811: Add @powersync/common as peer dependency
- Updated dependencies [62e43aa]
  - @powersync/common@1.9.0

## 0.1.3

### Patch Changes

- f5e42af: Introduced base tsconfig. SourceMaps are now excluded in dev and release publishes.
- Updated dependencies [f5e42af]
  - @powersync/common@1.8.1

## 0.1.2

### Patch Changes

- Updated dependencies [395ea24]
- Updated dependencies [9d1dc6f]
  - @powersync/common@1.8.0

## 0.1.1

### Patch Changes

- Updated dependencies [3c421ea]
  - @powersync/common@1.7.1

## 0.1.0

### Minor Changes

- a5550b2: Introduced `useQuery` and `useStatus` composables which include compilable query support. Deprecated `usePowerSyncQuery`, `usePowerSyncWatchedQuery`, and `usePowerSyncStatus`.

### Patch Changes

- Updated dependencies [c94be6a]
- Updated dependencies [2f1e034]
- Updated dependencies [21801b9]
  - @powersync/common@1.7.0

## 0.0.4

### Patch Changes

- Updated dependencies [b902077]
- Updated dependencies [ffe37cf]
- Updated dependencies [f9b9a96]
  - @powersync/common@1.6.1

## 0.0.3

### Patch Changes

- Updated dependencies [3aaee03]
  - @journeyapps/powersync-sdk-common@1.6.0

## 0.0.2

### Patch Changes

- 2a7b83f: rename package

## 0.0.1

### Patch Changes

- Updated dependencies [8cc1337]
  - @journeyapps/powersync-sdk-common@1.5.1
