# @journeyapps/powersync-sdk-react-native

## 1.0.1

### Patch Changes

- Updated dependencies [9bc088d]
  - @journeyapps/powersync-sdk-common@1.0.1
  - @journeyapps/powersync-react@1.0.1

## 1.0.0

### Major Changes

- c665b3f: Release out of beta to production ready

### Patch Changes

- Updated dependencies [c665b3f]
- Updated dependencies [c665b3f]
  - @journeyapps/powersync-sdk-common@1.0.0
  - @journeyapps/powersync-react@1.0.0

## 0.1.4

### Patch Changes

- Updated dependencies [80441ca]
- Updated dependencies [1b612d7]
  - @journeyapps/powersync-sdk-common@0.1.4
  - @journeyapps/powersync-react@0.1.3

## 0.1.3

### Patch Changes

- Updated dependencies [ba982eb]
  - @journeyapps/powersync-sdk-common@0.1.3
  - @journeyapps/powersync-react@0.1.2

## 0.1.2

### Patch Changes

- 2c0a54f: Fixed: `get`, `getAll` and `getOptional` should execute inside a readLock for concurrency
- Updated dependencies [280ab96]
- Updated dependencies [961f544]
  - @journeyapps/powersync-sdk-common@0.1.2
  - @journeyapps/powersync-react@0.1.1

## 0.1.1

### Patch Changes

- Updated dependencies [2032643]
  - @journeyapps/powersync-sdk-common@0.1.1

## 0.1.0

### Minor Changes

- 210de9d: Bump version for Beta release

### Patch Changes

- Updated dependencies [210de9d]
  - @journeyapps/powersync-sdk-common@0.1.0
  - @journeyapps/powersync-react@0.1.0

## 0.0.2

### Patch Changes

- ca458d3: Updated logic to correspond with React Native Quick SQLite concurrent transactions. Added helper methods on transaction contexts.

  API changes include:

  - Removal of synchronous DB operations in transactions: `execute`, `commit`, `rollback` are now async functions. `executeAsync`, `commitAsync` and `rollbackAsync` have been removed.
  - Transaction contexts now have `get`, `getAll` and `getOptional` helpers.
  - Added a default lock timeout of 2 minutes to aide with potential recursive lock/transaction requests.

- ab9957b: Update README polyfill command.
- b125f75: Use default timeout in post streaming warning message. Update connectivity status on streaming messages.
- 413a4d0: Added better logging of streaming errors. Added warnings if Polyfills are not correctly configured.
- Updated dependencies [ca458d3]
- Updated dependencies [b125f75]
- Updated dependencies [ab9957b]
- Updated dependencies [413a4d0]
  - @journeyapps/powersync-sdk-common@0.0.2
  - @journeyapps/powersync-react@0.0.2

## 0.0.1

### Patch Changes

- aad52c8: Updated watched queries to trigger for local only tables.
- 822bab9: Bump version to exit prerelease mode. Update SDK readme with known issues.
- Updated dependencies [aad52c8]
- Updated dependencies [5abb174]
- Updated dependencies [822bab9]
  - @journeyapps/powersync-sdk-common@0.0.1
  - @journeyapps/powersync-react@0.0.1

## 0.0.1-alpha.2

### Patch Changes

- aad52c8: Updated watched queries to trigger for local only tables.
- Updated dependencies [aad52c8]
  - @journeyapps/powersync-sdk-common@0.0.1-alpha.1
