# @powersync/react

## 1.5.1

### Patch Changes

- 7b49661: Queries will recalculate dependent tables if schema is updated.
- Updated dependencies [7b49661]
  - @powersync/common@1.21.0

## 1.5.0

### Minor Changes

- 2b0466f: Added `useSuspenseQuery` hook, allowing queries to suspend instead of returning `isLoading`/`isFetching` state.

### Patch Changes

- c8658ca: Fixed `useQuery()`'s' `isFetching` value staying true when used in react-native environment.

## 1.4.5

### Patch Changes

- f8ac369: Ensuring that `useQuery`'s `isFetching` becomes true immediately after the query changes.

## 1.4.4

### Patch Changes

- 70a70d5: Fixed issue with `useQuery` not supporting dynamic query parameters.
- Updated dependencies [9dea1b9]
  - @powersync/common@1.19.0

## 1.4.3

### Patch Changes

- 245bef5: Ensuring sourcemaps are not included for packages.
- Updated dependencies [944ee93]
- Updated dependencies [245bef5]
  - @powersync/common@1.18.1

## 1.4.2

### Patch Changes

- 02f0ce7: Updated dependencies.
- Updated dependencies [02f0ce7]
- Updated dependencies [7428f39]
- Updated dependencies [367d65d]
  - @powersync/common@1.18.0

## 1.4.1

### Patch Changes

- a65cd8c: chore: Added `isLoading` example to README
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

## 1.4.0

### Minor Changes

- 02ae5de: Prebundling dependencies with the aim of reducing the need for polyfills.

### Patch Changes

- Updated dependencies [32e342a]
- Updated dependencies [02ae5de]
  - @powersync/common@1.15.0

## 1.3.8

### Patch Changes

- 843cfec: revert peer dep change
- Updated dependencies [05f3dbd]
  - @powersync/common@1.14.0

## 1.3.7

### Patch Changes

- Updated dependencies [44c568b]
  - @powersync/common@1.13.1

## 1.3.6

### Patch Changes

- 31c61b9: Change @powersync/common peerDep to ^

## 1.3.5

### Patch Changes

- 48cc01c: Reinclude common package as a dependency

## 1.3.4

### Patch Changes

- 6b01811: Add @powersync/common as peer dependency
- Updated dependencies [62e43aa]
  - @powersync/common@1.9.0

## 1.3.3

### Patch Changes

- f5e42af: Introduced base tsconfig. SourceMaps are now excluded in dev and release publishes.
- Updated dependencies [f5e42af]
  - @powersync/common@1.8.1

## 1.3.2

### Patch Changes

- Updated dependencies [395ea24]
- Updated dependencies [9d1dc6f]
  - @powersync/common@1.8.0

## 1.3.1

### Patch Changes

- Updated dependencies [3c421ea]
  - @powersync/common@1.7.1

## 1.3.0

### Minor Changes

- c94be6a: Allow compilable queries to be used as hook arguments
- d62f367: Deprecate usePowerSyncStatus, usePowerSyncQuery and usePowerSyncWatchedQuery in favor of useQuery and useStatus

### Patch Changes

- Updated dependencies [c94be6a]
- Updated dependencies [2f1e034]
- Updated dependencies [21801b9]
  - @powersync/common@1.7.0

## 1.2.0

### Minor Changes

- 385edf8: Add `usePowerSyncStatus` hook

### Patch Changes

- ffe37cf: Update package names from @journey-apps/powersync- to @powersync/
- Updated dependencies [b902077]
- Updated dependencies [ffe37cf]
- Updated dependencies [f9b9a96]
  - @powersync/common@1.6.1

## 1.1.3

### Patch Changes

- Updated dependencies [3aaee03]
  - @journeyapps/powersync-sdk-common@1.6.0

## 1.1.2

### Patch Changes

- Updated dependencies [8cc1337]
  - @journeyapps/powersync-sdk-common@1.5.1

## 1.1.1

### Patch Changes

- Updated dependencies [8f7caa5]
- Updated dependencies [6c43ec6]
  - @journeyapps/powersync-sdk-common@1.5.0

## 1.1.0

### Minor Changes

- 9bf5a76: No longer using the async iterator version of the watch method for the usePowerSyncWatchedQuery hook, using the callback version instead.

### Patch Changes

- Updated dependencies [fd7ebc8]
  - @journeyapps/powersync-sdk-common@1.4.0

## 1.0.8

### Patch Changes

- Updated dependencies [8fc2164]
  - @journeyapps/powersync-sdk-common@1.3.2

## 1.0.7

### Patch Changes

- Updated dependencies [37e266d]
- Updated dependencies [77b3078]
  - @journeyapps/powersync-sdk-common@1.3.1

## 1.0.6

### Patch Changes

- Updated dependencies [1aed928]
- Updated dependencies [aede9e7]
  - @journeyapps/powersync-sdk-common@1.3.0

## 1.0.5

### Patch Changes

- Updated dependencies [1229e52]
- Updated dependencies [69592d0]
- Updated dependencies [69592d0]
  - @journeyapps/powersync-sdk-common@1.2.2

## 1.0.4

### Patch Changes

- Updated dependencies [a0e739e]
  - @journeyapps/powersync-sdk-common@1.2.1

## 1.0.3

### Patch Changes

- Updated dependencies [dd13da4]
- Updated dependencies [dd13da4]
  - @journeyapps/powersync-sdk-common@1.2.0

## 1.0.2

### Patch Changes

- Updated dependencies [6983121]
  - @journeyapps/powersync-sdk-common@1.1.0

## 1.0.1

### Patch Changes

- Updated dependencies [9bc088d]
  - @journeyapps/powersync-sdk-common@1.0.1

## 1.0.0

### Major Changes

- c665b3f: Release out of beta to production ready

### Patch Changes

- Updated dependencies [c665b3f]
  - @journeyapps/powersync-sdk-common@1.0.0

## 0.1.3

### Patch Changes

- Updated dependencies [80441ca]
- Updated dependencies [1b612d7]
  - @journeyapps/powersync-sdk-common@0.1.4

## 0.1.2

### Patch Changes

- Updated dependencies [ba982eb]
  - @journeyapps/powersync-sdk-common@0.1.3

## 0.1.1

### Patch Changes

- 961f544: Fixed: Added correct typings for React hooks. Previously hooks would return `any`.
- Updated dependencies [280ab96]
  - @journeyapps/powersync-sdk-common@0.1.2

## 0.1.0

### Minor Changes

- 210de9d: Bump version for Beta release

### Patch Changes

- Updated dependencies [210de9d]
  - @journeyapps/powersync-sdk-common@0.1.0

## 0.0.2

### Patch Changes

- Updated dependencies [ca458d3]
- Updated dependencies [b125f75]
- Updated dependencies [ab9957b]
- Updated dependencies [413a4d0]
  - @journeyapps/powersync-sdk-common@0.0.2

## 0.0.1

### Patch Changes

- 5abb174: Fix issue with PowerSync React hooks that caused an infinite re-renders, when no `parameters` are provided
- 822bab9: Bump version to exit prerelease mode. Update SDK readme with known issues.
- Updated dependencies [aad52c8]
- Updated dependencies [822bab9]
  - @journeyapps/powersync-sdk-common@0.0.1
