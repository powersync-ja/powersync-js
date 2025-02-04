# @powersync/react-native

## 1.17.0

### Minor Changes

- 0f28fb3: Add `retryDelayMs` and `crudUploadThrottleMs` to `connect` so that the values can be dynamically changed upon reconnecting.

### Patch Changes

- Updated dependencies [0f28fb3]
  - @powersync/common@1.23.0

## 1.16.3

### Patch Changes

- b38bcdb: Fixed an issue where the read and write locks were executing mutually exclusively. A read conccurent with a write or another read should correctly proceed instead of being blocked until the other lock has released.
- 2c86114: Update powersync-sqlite-core to 0.3.8 - Increase limit on number of columns per table to 1999.
- Updated dependencies [2c86114]
  - @powersync/common@1.22.2

## 1.16.2

### Patch Changes

- Updated dependencies [7a47778]
- Updated dependencies [4a262cd]
  - @powersync/common@1.22.1

## 1.16.1

### Patch Changes

- Updated dependencies [77a9ed2]
  - @powersync/common@1.22.0

## 1.16.0

### Minor Changes

- d1d740d: Update RNQS to v 2.2.0 for Expo 52 and RN 0.76 support

## 1.15.1

### Patch Changes

- fa26eb4: Update powersync-sqlite-core to 0.3.6 to fix issue with dangling rows

## 1.15.0

### Minor Changes

- 7b49661: Added `refreshSchema()` which will cause all connections to be aware of a schema change.

### Patch Changes

- Updated dependencies [7b49661]
- Updated dependencies [7b49661]
  - @powersync/common@1.21.0
  - @powersync/react@1.5.1

## 1.14.4

### Patch Changes

- 96f1a87: Improved `getCrudBatch` to use a default limit of 100 CRUD entries.
- Updated dependencies [96f1a87]
  - @powersync/common@1.20.2

## 1.14.3

### Patch Changes

- Updated dependencies [79d4211]
  - @powersync/common@1.20.1

## 1.14.2

### Patch Changes

- Updated dependencies [c8658ca]
- Updated dependencies [2b0466f]
  - @powersync/react@1.5.0

## 1.14.1

### Patch Changes

- a3f625e: Fix inline require for react-native-quick-sqlite

## 1.14.0

### Minor Changes

- 77e196d: Use powersync-sqlite-core 0.3.0 - faster incremental sync

### Patch Changes

- Updated dependencies [77e196d]
  - @powersync/common@1.20.0

## 1.13.0

### Minor Changes

- 9c140b5: Make `react-native-quick-sqlite` an optional dependency so that it can be used conditionally.

## 1.12.4

### Patch Changes

- Updated dependencies [f8ac369]
  - @powersync/react@1.4.5

## 1.12.3

### Patch Changes

- Updated dependencies [9dea1b9]
- Updated dependencies [70a70d5]
  - @powersync/common@1.19.0
  - @powersync/react@1.4.4

## 1.12.2

### Patch Changes

- 944ee93: Fixed issue where sequentially mutating the same row multiple times could cause the CRUD upload queue monitoring to think CRUD operations have not been processed correctly by the `BackendConnector` `uploadData` method.
- 245bef5: Ensuring sourcemaps are not included for packages.
- Updated dependencies [944ee93]
- Updated dependencies [245bef5]
  - @powersync/common@1.18.1
  - @powersync/react@1.4.3

## 1.12.1

### Patch Changes

- 02f0ce7: Updated dependencies.
- Updated dependencies [02f0ce7]
- Updated dependencies [7428f39]
- Updated dependencies [367d65d]
  - @powersync/common@1.18.0
  - @powersync/react@1.4.2

## 1.12.0

### Minor Changes

- 447f979: Use react-native-quick-sqlite 1.3.0 / powersync-sqlite-core 0.2.1.

### Patch Changes

- b4d64f0: Updated crypto.js vendor file to include fast-base64-decode dependency instead of bundling it.
- 892e172: fixed Flipper warning still showing if an HTTP request rejected due to an error.
- Updated dependencies [447f979]
- Updated dependencies [b1a76b3]
- Updated dependencies [e77b1ab]
- Updated dependencies [a65cd8c]
- Updated dependencies [c04ecfc]
- Updated dependencies [447f979]
- Updated dependencies [f202944]
- Updated dependencies [447f979]
- Updated dependencies [447f979]
- Updated dependencies [447f979]
- Updated dependencies [447f979]
  - @powersync/common@1.17.0
  - @powersync/react@1.4.1

## 1.11.0

### Minor Changes

- 9f95437: Updated default streaming connection method to use WebSockets

### Patch Changes

- Updated dependencies [9521e24]
- Updated dependencies [7d04f74]
- Updated dependencies [4fc1de3]
  - @powersync/common@1.16.2

## 1.10.1

### Patch Changes

- Updated dependencies [7668495]
  - @powersync/common@1.16.1

## 1.10.0

### Minor Changes

- 042589c: Added a warning if connector `uploadData` functions don't process CRUD items completely.

### Patch Changes

- Updated dependencies [042589c]
  - @powersync/common@1.16.0

## 1.9.0

### Minor Changes

- 02ae5de: Prebundling react-native dependencies with the aim of reducing the need for polyfills.

### Patch Changes

- Updated dependencies [02ae5de]
- Updated dependencies [32e342a]
- Updated dependencies [02ae5de]
  - @powersync/react@1.4.0
  - @powersync/common@1.15.0

## 1.8.4

### Patch Changes

- 843cfec: revert peer dep change
- Updated dependencies [843cfec]
- Updated dependencies [05f3dbd]
  - @powersync/react@1.3.8
  - @powersync/common@1.14.0

## 1.8.3

### Patch Changes

- Updated dependencies [44c568b]
  - @powersync/common@1.13.1
  - @powersync/react@1.3.7

## 1.8.2

### Patch Changes

- 31c61b9: Change @powersync/common peerDep to ^
- Updated dependencies [31c61b9]
  - @powersync/react@1.3.6

## 1.8.1

### Patch Changes

- 8d5b702: Updated dependencies

## 1.8.0

### Minor Changes

- dca599f: Improved constructor behavior of `PowerSyncDatabase` and logic for open factories. Deprecated `RNQSPowerSyncDatabaseOpenFactory` and `WASQLitePowerSyncDatabaseOpenFactory`.

### Patch Changes

- Updated dependencies [dca599f]
  - @powersync/common@1.13.0

## 1.7.2

### Patch Changes

- Updated dependencies [590ee67]
  - @powersync/common@1.12.0

## 1.7.1

### Patch Changes

- Updated dependencies [1b66145]
  - @powersync/common@1.11.1

## 1.7.0

### Minor Changes

- 820a81d: Fixed potentially using incorrect `fetch` implementation by directly depending on `react-native-fetch-api`

### Patch Changes

- Updated dependencies [820a81d]
  - @powersync/common@1.11.0

## 1.6.2

### Patch Changes

- e86e61d: Update PowerSync branding
- Updated dependencies [32dc7e3]
  - @powersync/common@1.10.0

## 1.6.1

### Patch Changes

- 48cc01c: Reinclude common package as a dependency
- Updated dependencies [48cc01c]
  - @powersync/react@1.3.5

## 1.6.0

### Minor Changes

- 62e43aa: Improved import and usage of BSON library.

### Patch Changes

- 6b01811: Add @powersync/common as peer dependency
- Updated dependencies [62e43aa]
- Updated dependencies [6b01811]
  - @powersync/common@1.9.0
  - @powersync/react@1.3.4

## 1.5.1

### Patch Changes

- f5e42af: Introduced base tsconfig. SourceMaps are now excluded in dev and release publishes.
- Updated dependencies [f5e42af]
  - @powersync/common@1.8.1
  - @powersync/react@1.3.3

## 1.5.0

### Minor Changes

- 9d1dc6f: Added support for WebSocket sync stream connections.

### Patch Changes

- 395ea24: Remove react-native-get-random-values dependency
- Updated dependencies [395ea24]
- Updated dependencies [9d1dc6f]
  - @powersync/common@1.8.0
  - @powersync/react@1.3.2

## 1.4.6

### Patch Changes

- Updated dependencies [3c421ea]
  - @powersync/common@1.7.1
  - @powersync/react@1.3.1

## 1.4.5

### Patch Changes

- Updated dependencies [c94be6a]
- Updated dependencies [2f1e034]
- Updated dependencies [21801b9]
- Updated dependencies [d62f367]
  - @powersync/common@1.7.0
  - @powersync/react@1.3.0

## 1.4.4

### Patch Changes

- bed3be5: Updated @journeyapps/react-native-quick-sqlite dependency.

## 1.4.3

### Patch Changes

- ffe37cf: Update package names from @journey-apps/powersync- to @powersync/
- b902077: Updated react-native-quick-sqlite dependency.
- Updated dependencies [385edf8]
- Updated dependencies [b902077]
- Updated dependencies [ffe37cf]
- Updated dependencies [f9b9a96]
  - @powersync/react@1.2.0
  - @powersync/common@1.6.1

## 1.4.2

### Patch Changes

- Updated dependencies [3aaee03]
  - @journeyapps/powersync-sdk-common@1.6.0
  - @journeyapps/powersync-react@1.1.3

## 1.4.1

### Patch Changes

- Updated dependencies [8cc1337]
  - @journeyapps/powersync-sdk-common@1.5.1
  - @journeyapps/powersync-react@1.1.2

## 1.4.0

### Minor Changes

- 8f7caa5: Added batch execution functionality to the web and react-native SDKs. This feature allows a SQL statement with multiple parameters to be executed in a single transaction, improving performance and consistency.

### Patch Changes

- Updated dependencies [8f7caa5]
- Updated dependencies [6c43ec6]
  - @journeyapps/powersync-sdk-common@1.5.0
  - @journeyapps/powersync-react@1.1.1

## 1.3.3

### Patch Changes

- Updated dependencies [9bf5a76]
- Updated dependencies [fd7ebc8]
  - @journeyapps/powersync-react@1.1.0
  - @journeyapps/powersync-sdk-common@1.4.0

## 1.3.2

### Patch Changes

- Updated dependencies [8fc2164]
  - @journeyapps/powersync-sdk-common@1.3.2
  - @journeyapps/powersync-react@1.0.8

## 1.3.1

### Patch Changes

- Updated dependencies [37e266d]
- Updated dependencies [77b3078]
  - @journeyapps/powersync-sdk-common@1.3.1
  - @journeyapps/powersync-react@1.0.7

## 1.3.0

### Minor Changes

- 1aed928: Fix PowerSyncBackendConnector.fetchCredentials type to allow returning null

### Patch Changes

- Updated dependencies [1aed928]
- Updated dependencies [aede9e7]
  - @journeyapps/powersync-sdk-common@1.3.0
  - @journeyapps/powersync-react@1.0.6

## 1.2.2

### Patch Changes

- Updated dependencies [1229e52]
- Updated dependencies [69592d0]
- Updated dependencies [69592d0]
  - @journeyapps/powersync-sdk-common@1.2.2
  - @journeyapps/powersync-react@1.0.5

## 1.2.1

### Patch Changes

- a0e739e: Fixed issue where SDK would fail to reconnect after disconnecting.
- Updated dependencies [a0e739e]
  - @journeyapps/powersync-sdk-common@1.2.1
  - @journeyapps/powersync-react@1.0.4

## 1.2.0

### Minor Changes

- dd13da4: Bumped powersync-sqlite-core to v0.1.6. dependant projects should:
  - Upgrade to `@journeyapps/react-native-quick-sqlite@1.1.1`
  - run `pod repo update && pod update` in the `ios` folder for updates to reflect.

### Patch Changes

- dd13da4: Added global locks for syncing connections. Added warning when creating multiple Powersync instances.
- Updated dependencies [dd13da4]
- Updated dependencies [dd13da4]
  - @journeyapps/powersync-sdk-common@1.2.0
  - @journeyapps/powersync-react@1.0.3

## 1.1.0

### Minor Changes

- 6983121: Added the ability to receive batched table updates from DB adapters.

### Patch Changes

- 6983121: Fixed watched queries from updating before writes have been commited on the write connection.
- Updated dependencies [6983121]
  - @journeyapps/powersync-sdk-common@1.1.0
  - @journeyapps/powersync-react@1.0.2

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
