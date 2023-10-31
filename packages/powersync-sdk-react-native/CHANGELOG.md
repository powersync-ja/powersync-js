# @journeyapps/powersync-sdk-react-native

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
