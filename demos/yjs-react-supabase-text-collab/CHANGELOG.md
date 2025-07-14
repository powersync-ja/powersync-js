# yjs-react-supabase-text-collab

## 0.2.0

- Added a local development option with local Supabase and PowerSync services.
- Updated Sync rules to use client parameters. Each client now only syncs `document` and `document_updates` for the document being edited.
- Updated `PowerSyncYjsProvider` to use an incremental watched query for `document_updates`.

## 0.1.16

### Patch Changes

- @powersync/react@1.3.7
- @powersync/web@1.2.4

## 0.1.15

### Patch Changes

- Updated dependencies [31c61b9]
  - @powersync/react@1.3.6
  - @powersync/web@1.2.3

## 0.1.14

### Patch Changes

- cfd54e3: Locking `swc/core` dependency to `~1.6.0` to fix builds of demos using vite.
- Updated dependencies [a1b52be]
  - @powersync/web@1.2.2

## 0.1.13

### Patch Changes

- 27126e6: Ensuring that SupabaseConnector's error codes are evaluated when processing upload queue.
- Updated dependencies [8d5b702]
  - @powersync/web@1.2.1

## 0.1.12

### Patch Changes

- Updated dependencies [dca599f]
  - @powersync/web@1.2.0

## 0.1.11

### Patch Changes

- Updated dependencies [590ee67]
  - @powersync/web@1.1.0

## 0.1.10

### Patch Changes

- @powersync/web@1.0.2

## 0.1.9

### Patch Changes

- @powersync/web@1.0.1

## 0.1.8

### Patch Changes

- e86e61d: Update PowerSync branding
- Updated dependencies [32dc7e3]
- Updated dependencies [e86e61d]
  - @powersync/web@1.0.0

## 0.1.7

### Patch Changes

- Updated dependencies [c3f29a1]
  - @powersync/web@0.8.1

## 0.1.6

### Patch Changes

- Updated dependencies [7943626]
- Updated dependencies [48cc01c]
  - @powersync/web@0.8.0
  - @powersync/react@1.3.5

## 0.1.5

### Patch Changes

- Updated dependencies [62e43aa]
- Updated dependencies [6b01811]
  - @powersync/web@0.7.0
  - @powersync/react@1.3.4

## 0.1.4

### Patch Changes

- c3588c0: Updated the vite conf include rules for bson, buffer, rsocket and cross-fetch.

## 0.1.3

### Patch Changes

- Updated dependencies [f5e42af]
  - @powersync/react@1.3.3
  - @powersync/web@0.6.1

## 0.1.2

### Patch Changes

- 9d1dc6f: Updated Vite config for BSON library
- Updated dependencies [395ea24]
- Updated dependencies [9d1dc6f]
  - @powersync/web@0.6.0
  - @powersync/react@1.3.2

## 0.1.1

### Patch Changes

- @powersync/react@1.3.1
- @powersync/web@0.5.3

## 0.1.0

### Minor Changes

- d62f367: Deprecate usePowerSyncStatus, usePowerSyncQuery and usePowerSyncWatchedQuery in favor of useQuery and useStatus

### Patch Changes

- Updated dependencies [c94be6a]
- Updated dependencies [d62f367]
  - @powersync/react@1.3.0
  - @powersync/web@0.5.2

## 0.0.14

### Patch Changes

- 371e8ce: Updated Vite Demo apps' `include` entries to use nested dependency syntax, fixes issue with CJS nested dependencies.

## 0.0.13

### Patch Changes

- Updated dependencies [385edf8]
- Updated dependencies [ffe37cf]
  - @powersync/react@1.2.0
  - @powersync/web@0.5.1

## 0.0.12

### Patch Changes

- Updated dependencies [3aaee03]
  - @journeyapps/powersync-sdk-web@0.5.0
  - @journeyapps/powersync-react@1.1.3

## 0.0.11

### Patch Changes

- @journeyapps/powersync-react@1.1.2
- @journeyapps/powersync-sdk-web@0.4.1

## 0.0.10

### Patch Changes

- Updated dependencies [6c43ec6]
- Updated dependencies [8f7caa5]
  - @journeyapps/powersync-sdk-web@0.4.0
  - @journeyapps/powersync-react@1.1.1

## 0.0.9

### Patch Changes

- Updated dependencies [9bf5a76]
  - @journeyapps/powersync-react@1.1.0
  - @journeyapps/powersync-sdk-web@0.3.3

## 0.0.8

### Patch Changes

- Updated dependencies [8fc2164]
  - @journeyapps/powersync-sdk-web@0.3.2
  - @journeyapps/powersync-react@1.0.8

## 0.0.7

### Patch Changes

- Updated dependencies [37e266d]
- Updated dependencies [77b3078]
- Updated dependencies [37e266d]
  - @journeyapps/powersync-sdk-web@0.3.1
  - @journeyapps/powersync-react@1.0.7

## 0.0.6

### Patch Changes

- Updated dependencies [1aed928]
- Updated dependencies [aede9e7]
  - @journeyapps/powersync-sdk-web@0.3.0
  - @journeyapps/powersync-react@1.0.6

## 0.0.5

### Patch Changes

- Updated dependencies [e472f17]
  - @journeyapps/powersync-sdk-web@0.2.3

## 0.0.4

### Patch Changes

- Updated dependencies [69592d0]
  - @journeyapps/powersync-sdk-web@0.2.2
  - @journeyapps/powersync-react@1.0.5

## 0.0.3

### Patch Changes

- @journeyapps/powersync-react@1.0.4
- @journeyapps/powersync-sdk-web@0.2.1

## 0.0.2

### Patch Changes

- Updated dependencies [d20386c]
  - @journeyapps/powersync-sdk-web@0.2.0
