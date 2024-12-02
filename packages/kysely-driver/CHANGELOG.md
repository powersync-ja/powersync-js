# @powersync/kysely-driver

## 1.1.0

### Minor Changes

- 77a9ed2: Added `watch()` function to Kysely wrapper to support watched queries. This function invokes `execute()` on the Kysely query which improves support for complex queries and Kysely plugins.

### Patch Changes

- Updated dependencies [77a9ed2]
  - @powersync/common@1.22.0

## 1.0.0

### Major Changes

- 16291ae: Move kysely out of Beta

### Patch Changes

- 7589720: Update kysely to 0.27.4
- Updated dependencies [96f1a87]
  - @powersync/common@1.20.2

## 0.4.2

### Patch Changes

- 245bef5: Ensuring sourcemaps are not included for packages.
- Updated dependencies [944ee93]
- Updated dependencies [245bef5]
  - @powersync/common@1.18.1

## 0.4.1

### Patch Changes

- 02f0ce7: Updated dependencies.
- Updated dependencies [02f0ce7]
- Updated dependencies [7428f39]
- Updated dependencies [367d65d]
  - @powersync/common@1.18.0

## 0.4.0

### Minor Changes

- c04ecfc: Made `dialect` in `wrapPowerSyncWithKysely` options optional since the method provides a PowerSync dialect by default.

### Patch Changes

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

## 0.3.0

### Minor Changes

- 02ae5de: Prebundling dependencies with the aim of reducing the need for polyfills.

### Patch Changes

- Updated dependencies [32e342a]
- Updated dependencies [02ae5de]
  - @powersync/common@1.15.0

## 0.2.9

### Patch Changes

- 843cfec: revert peer dep change
- Updated dependencies [05f3dbd]
  - @powersync/common@1.14.0

## 0.2.8

### Patch Changes

- Updated dependencies [44c568b]
  - @powersync/common@1.13.1

## 0.2.7

### Patch Changes

- 31c61b9: Change @powersync/common peerDep to ^

## 0.2.6

### Patch Changes

- e86e61d: Update PowerSync branding
- Updated dependencies [32dc7e3]
  - @powersync/common@1.10.0

## 0.2.5

### Patch Changes

- 48cc01c: Reinclude common package as a dependency

## 0.2.4

### Patch Changes

- 6b01811: Add @powersync/common as peer dependency
- Updated dependencies [62e43aa]
  - @powersync/common@1.9.0

## 0.2.3

### Patch Changes

- f5e42af: Introduced base tsconfig. SourceMaps are now excluded in dev and release publishes.
- Updated dependencies [f5e42af]
  - @powersync/common@1.8.1

## 0.2.2

### Patch Changes

- Updated dependencies [395ea24]
- Updated dependencies [9d1dc6f]
  - @powersync/common@1.8.0

## 0.2.1

### Patch Changes

- Updated dependencies [3c421ea]
  - @powersync/common@1.7.1

## 0.2.0

### Minor Changes

- 3e92a9c: Made `destroy` and `releaseConnection` no-op functions. If you relied on `destroy` you will need to use `disconnectAndClear` on the PowerSync DB directly.

### Patch Changes

- Updated dependencies [c94be6a]
- Updated dependencies [2f1e034]
- Updated dependencies [21801b9]
  - @powersync/common@1.7.0

## 0.1.9

### Patch Changes

- Updated dependencies [b902077]
- Updated dependencies [ffe37cf]
- Updated dependencies [f9b9a96]
  - @powersync/common@1.6.1

## 0.1.8

### Patch Changes

- Updated dependencies [3aaee03]
  - @journeyapps/powersync-sdk-common@1.6.0

## 0.1.7

### Patch Changes

- Updated dependencies [8cc1337]
  - @journeyapps/powersync-sdk-common@1.5.1

## 0.1.6

### Patch Changes

- Updated dependencies [8f7caa5]
- Updated dependencies [6c43ec6]
  - @journeyapps/powersync-sdk-common@1.5.0

## 0.1.5

### Patch Changes

- Updated dependencies [fd7ebc8]
  - @journeyapps/powersync-sdk-common@1.4.0

## 0.1.4

### Patch Changes

- Updated dependencies [8fc2164]
  - @journeyapps/powersync-sdk-common@1.3.2

## 0.1.3

### Patch Changes

- Updated dependencies [37e266d]
- Updated dependencies [77b3078]
  - @journeyapps/powersync-sdk-common@1.3.1

## 0.1.2

### Patch Changes

- Updated dependencies [1aed928]
- Updated dependencies [aede9e7]
  - @journeyapps/powersync-sdk-common@1.3.0

## 0.1.1

### Patch Changes

- 67c135f: Updated readme with Schema definition examples.

## 0.1.0

### Minor Changes

- 0ff3228: Initial release of Kysely driver
