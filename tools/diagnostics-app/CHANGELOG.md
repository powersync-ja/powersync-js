# diagnostics-app

## 0.11.0

### Minor Changes

- 062af45: Added a SQLite File Inspector page with drag-and-drop support. Added search and sorting to the DataTable. Added the ability to unsubscribe from sync streams.

### Patch Changes

- f0a36c9: Update PowerSync SQLite core extension to version 0.4.11.
- Updated dependencies [f0a36c9]
  - @powersync/web@1.34.0
  - @powersync/react@1.8.3

## 0.11.0

### Minor Changes

- 2a7e8d3: Added state tracking and improved UX around client parameters
- a7af6c1: Migrate routing to @tanstack/react-router and simplify client parameters UI

### Patch Changes

- Updated dependencies [d86799a]
- Updated dependencies [ae3b188]
- Updated dependencies [c506299]
- Updated dependencies [569cb41]
  - @powersync/web@1.33.0
  - @powersync/react@1.8.3

## 0.10.0

### Minor Changes

- 9a1970c: Migrate from Material UI to shadcn/ui with Tailwind CSS for consistency with PowerSync Dashboard

### Patch Changes

- Updated dependencies [25ece59]
- Updated dependencies [8db47f3]
- Updated dependencies [aaf6037]
- Updated dependencies [acf6b70]
- Updated dependencies [aaf6037]
  - @powersync/web@1.32.0
  - @powersync/react@1.8.2

## 0.9.21

### Patch Changes

- Updated dependencies [d0c67b1]
- Updated dependencies [133f376]
  - @powersync/web@1.31.0
  - @powersync/react@1.8.2

## 0.9.20

### Patch Changes

- Updated dependencies [299c6dc]
- Updated dependencies [616c2a1]
  - @powersync/web@1.30.0
  - @powersync/react@1.8.2

## 0.9.19

### Patch Changes

- @powersync/react@1.8.2
- @powersync/web@1.29.1

## 0.9.18

### Patch Changes

- Updated dependencies [507197f]
- Updated dependencies [e88154e]
- Updated dependencies [507197f]
  - @powersync/web@1.29.0
  - @powersync/react@1.8.2

## 0.9.17

### Patch Changes

- @powersync/react@1.8.2
- @powersync/web@1.28.2

## 0.9.16

### Patch Changes

- 3e4a25c: Don't minify releases, enable source maps.
- Updated dependencies [3e4a25c]
  - @powersync/react@1.8.2
  - @powersync/web@1.28.1

## 0.9.15

### Patch Changes

- Updated dependencies [2f8b30c]
  - @powersync/web@1.28.0
  - @powersync/react@1.8.1

## 0.9.14

### Patch Changes

- ac82680: - Fixed bug where Rust client implementation would not update the dynamic schema after sync.
  - Improved dynamic schema refresh logic for all implementations. Updating the schema should now always update all dependent watched queries e.g. in the SQL Console.

## 0.9.13

### Patch Changes

- 0c94c40: Rename Diagnostics App to Sync Diagnostics Client
- Updated dependencies [3008dbc]
  - @powersync/react@1.8.1
  - @powersync/web@1.27.1

## 0.9.12

### Patch Changes

- 0a6af1c: Added support for a "token" query parameter, when supplied to the root URL it will be used as the API token for the diagnostics tool instead of needing to be provided manually to the login form.

## 0.9.11

### Patch Changes

- c78071f: Update core extension to 0.4.6
- Updated dependencies [eff8cbf]
- Updated dependencies [d8236aa]
- Updated dependencies [c9c1e24]
- Updated dependencies [7a5aaf5]
- Updated dependencies [c78071f]
  - @powersync/web@1.27.0
  - @powersync/react@1.8.0

## 0.9.10

### Patch Changes

- Updated dependencies [a0ee132]
  - @powersync/react@1.7.4
  - @powersync/web@1.26.2

## 0.9.9

### Patch Changes

- 9003153: Update core extension to 0.4.5
- ce40042: Support Rust client.
- Updated dependencies [9003153]
- Updated dependencies [b1aca34]
  - @powersync/web@1.26.1
  - @powersync/react@1.7.3

## 0.9.8

### Patch Changes

- Updated dependencies [c191989]
  - @powersync/react@1.7.2

## 0.9.7

### Patch Changes

- 47294f2: Update PowerSync core extension to version 0.4.4
- Updated dependencies [c910c66]
- Updated dependencies [8decd49]
- Updated dependencies [9e3e3a5]
- Updated dependencies [47294f2]
  - @powersync/web@1.26.0
  - @powersync/react@1.7.1

## 0.9.6

### Patch Changes

- Updated dependencies [dce523a]
- Updated dependencies [7ad251a]
- Updated dependencies [7ad251a]
  - @powersync/react@1.7.0
  - @powersync/web@1.25.1

## 0.9.5

### Patch Changes

- Updated dependencies [319012e]
- Updated dependencies [79acd89]
- Updated dependencies [c7d2b53]
- Updated dependencies [6b38551]
- Updated dependencies [c7d2b53]
- Updated dependencies [c7d2b53]
  - @powersync/web@1.25.0
  - @powersync/react@1.6.0

## 0.9.4

### Patch Changes

- Updated dependencies [ab33799]
- Updated dependencies [810c6ad]
- Updated dependencies [a9f6eba]
- Updated dependencies [a1aa18c]
  - @powersync/web@1.24.0
  - @powersync/react@1.5.3

## 0.9.3

### Patch Changes

- @powersync/react@1.5.3
- @powersync/web@1.23.2

## 0.9.2

### Patch Changes

- ffe3095: Improve websocket keepalive logic to reduce keepalive errors.
- Updated dependencies [b398483]
- Updated dependencies [ffe3095]
- Updated dependencies [53236a8]
- Updated dependencies [d1b7fcb]
  - @powersync/web@1.23.1
  - @powersync/react@1.5.3

## 0.9.1

### Patch Changes

- Updated dependencies [cbb20c0]
- Updated dependencies [0446f15]
  - @powersync/web@1.23.0
  - @powersync/react@1.5.3

## 0.9.0

### Minor Changes

- 96ddd5d: - Added Sync error alert banner to all views.
  - Fix bug where clicking signOut would not disconnect from the PowerSync service.
  - Updated implementation to fetch sync errors from the SyncStatus.

### Patch Changes

- 6707966: Fix reconnecting after changing credentials.
- Updated dependencies [96ddd5d]
  - @powersync/web@1.22.0
  - @powersync/react@1.5.3

## 0.8.14

### Patch Changes

- @powersync/react@1.5.3
- @powersync/web@1.21.1

## 0.8.13

### Patch Changes

- Updated dependencies [0565a0a]
- Updated dependencies [fccf11e]
  - @powersync/web@1.21.0
  - @powersync/react@1.5.3

## 0.8.12

### Patch Changes

- d3c8d7f: Fix handling of partial checkpoints
  - @powersync/react@1.5.3
  - @powersync/web@1.20.1

## 0.8.11

### Patch Changes

- Updated dependencies [4f68f6a]
- Updated dependencies [ed11438]
- Updated dependencies [cbab03e]
  - @powersync/web@1.20.0
  - @powersync/react@1.5.3

## 0.8.10

### Patch Changes

- Updated dependencies [6807df6]
- Updated dependencies [e71dc94]
- Updated dependencies [6807df6]
  - @powersync/react@1.5.3
  - @powersync/web@1.19.0

## 0.8.9

### Patch Changes

- Updated dependencies [be18c65]
- Updated dependencies [7fe70bd]
  - @powersync/web@1.18.0

## 0.8.8

### Patch Changes

- @powersync/react@1.5.2
- @powersync/web@1.17.2

## 0.8.7

### Patch Changes

- @powersync/react@1.5.2
- @powersync/web@1.17.1

## 0.8.6

### Patch Changes

- Updated dependencies [fafd562]
  - @powersync/web@1.17.0

## 0.8.5

### Patch Changes

- Updated dependencies [f8fd814]
- Updated dependencies [f0c49f9]
  - @powersync/web@1.16.0
  - @powersync/react@1.5.2

## 0.8.4

### Patch Changes

- Updated dependencies [0c8ddda]
- Updated dependencies [fcb9d58]
  - @powersync/web@1.15.1
  - @powersync/react@1.5.2

## 0.8.3

### Patch Changes

- Updated dependencies [26025f0]
  - @powersync/web@1.15.0

## 0.8.2

### Patch Changes

- Updated dependencies [fe98172]
- Updated dependencies [17fc01e]
  - @powersync/web@1.14.2
  - @powersync/react@1.5.1

## 0.8.1

### Patch Changes

- Updated dependencies [44582ef]
  - @powersync/web@1.14.1

## 0.8.0

### Minor Changes

- e1c44ad: Improve diagnostics app performance for bulk downloads.
- 56185bb: Switch diagnostics app to OPFS.

### Patch Changes

- Updated dependencies [56185bb]
  - @powersync/web@1.14.0

## 0.7.8

### Patch Changes

- @powersync/web@1.13.1

## 0.7.7

### Patch Changes

- Updated dependencies [065aba6]
  - @powersync/web@1.13.0

## 0.7.6

### Patch Changes

- 2c86114: Update powersync-sqlite-core to 0.3.8 - Increase limit on number of columns per table to 1999.
- Updated dependencies [2c86114]
  - @powersync/web@1.12.3

## 0.7.5

### Patch Changes

- @powersync/web@1.12.2

## 0.7.4

### Patch Changes

- @powersync/web@1.12.1

## 0.7.3

### Patch Changes

- Updated dependencies [7e23d65]
- Updated dependencies [36af0c8]
  - @powersync/web@1.12.0

## 0.7.2

### Patch Changes

- Updated dependencies [bacc1c5]
  - @powersync/web@1.11.0

## 0.7.1

### Patch Changes

- fa26eb4: Update powersync-sqlite-core to 0.3.6 to fix issue with dangling rows
- Updated dependencies [fa26eb4]
  - @powersync/web@1.10.2

## 0.7.0

### Minor Changes

- 677d782: Improved error messages for some token or endpoint issues
- db84a30: Support specifying client parameter types

## 0.6.5

### Patch Changes

- Updated dependencies [e9773d9]
  - @powersync/web@1.10.1

## 0.6.4

### Patch Changes

- Updated dependencies [7b49661]
- Updated dependencies [7b49661]
  - @powersync/web@1.10.0
  - @powersync/react@1.5.1

## 0.6.3

### Patch Changes

- Updated dependencies [96f1a87]
  - @powersync/web@1.9.2

## 0.6.2

### Patch Changes

- Updated dependencies [79d4211]
- Updated dependencies [8554526]
  - @powersync/web@1.9.1

## 0.6.1

### Patch Changes

- Updated dependencies [c8658ca]
- Updated dependencies [2b0466f]
  - @powersync/react@1.5.0

## 0.6.0

### Minor Changes

- 77e196d: Use powersync-sqlite-core 0.3.0 - faster incremental sync

### Patch Changes

- Updated dependencies [77e196d]
  - @powersync/web@1.9.0

## 0.5.0

### Minor Changes

- 6ce2afb: Updated schema generated by diagnostics app + increased descriptiveness of the preceding comment"

### Patch Changes

- Updated dependencies [f8ac369]
  - @powersync/react@1.4.5

## 0.4.2

### Patch Changes

- Updated dependencies [70a70d5]
  - @powersync/react@1.4.4
  - @powersync/web@1.8.2

## 0.4.1

### Patch Changes

- Updated dependencies [944ee93]
- Updated dependencies [245bef5]
  - @powersync/web@1.8.1
  - @powersync/react@1.4.3

## 0.4.0

### Minor Changes

- 7428f39: Remove lodash dependency.

### Patch Changes

- Updated dependencies [02f0ce7]
- Updated dependencies [7428f39]
- Updated dependencies [02f0ce7]
  - @powersync/react@1.4.2
  - @powersync/web@1.8.0

## 0.3.5

### Patch Changes

- Updated dependencies [b1a76b3]
- Updated dependencies [a65cd8c]
- Updated dependencies [c04ecfc]
- Updated dependencies [447f979]
  - @powersync/web@1.7.0
  - @powersync/react@1.4.1

## 0.3.4

### Patch Changes

- Updated dependencies [9f95437]
- Updated dependencies [2db0e8f]
  - @powersync/web@1.6.0

## 0.3.3

### Patch Changes

- d3379c5: Improve extracting endpoint from token audience.
- Updated dependencies [58fd059]
  - @powersync/web@1.5.1

## 0.3.2

### Patch Changes

- Updated dependencies [042589c]
  - @powersync/web@1.5.0

## 0.3.1

### Patch Changes

- Updated dependencies [02ae5de]
- Updated dependencies [32e342a]
  - @powersync/react@1.4.0
  - @powersync/web@1.4.0

## 0.3.0

### Minor Changes

- 79eaa25: Add docker image

### Patch Changes

- Updated dependencies [843cfec]
- Updated dependencies [05f3dbd]
  - @powersync/react@1.3.8
  - @powersync/web@1.3.0

## 0.2.2

### Patch Changes

- @powersync/react@1.3.7
- @powersync/web@1.2.4

## 0.2.1

### Patch Changes

- Updated dependencies [31c61b9]
  - @powersync/react@1.3.6
  - @powersync/web@1.2.3

## 0.2.0

### Minor Changes

- 1b2b207: Faster initial sync and other fixes

### Patch Changes

- cfd54e3: Locking `swc/core` dependency to `~1.6.0` to fix builds of demos using vite.
- Updated dependencies [a1b52be]
  - @powersync/web@1.2.2

## 0.1.14

### Patch Changes

- Updated dependencies [8d5b702]
  - @powersync/web@1.2.1

## 0.1.13

### Patch Changes

- Updated dependencies [dca599f]
  - @powersync/web@1.2.0

## 0.1.12

### Patch Changes

- e78aa48: Display empty buckets in sync diagnostics
- Updated dependencies [590ee67]
  - @powersync/web@1.1.0

## 0.1.11

### Patch Changes

- @powersync/web@1.0.2

## 0.1.10

### Patch Changes

- @powersync/web@1.0.1

## 0.1.9

### Patch Changes

- Updated dependencies [32dc7e3]
- Updated dependencies [e86e61d]
  - @powersync/web@1.0.0

## 0.1.8

### Patch Changes

- Updated dependencies [c3f29a1]
  - @powersync/web@0.8.1

## 0.1.7

### Patch Changes

- Updated dependencies [7943626]
- Updated dependencies [48cc01c]
  - @powersync/web@0.8.0
  - @powersync/react@1.3.5

## 0.1.6

### Patch Changes

- Updated dependencies [62e43aa]
- Updated dependencies [6b01811]
  - @powersync/web@0.7.0
  - @powersync/react@1.3.4

## 0.1.5

### Patch Changes

- Updated dependencies [f5e42af]
  - @powersync/react@1.3.3
  - @powersync/web@0.6.1

## 0.1.4

### Patch Changes

- Updated dependencies [395ea24]
- Updated dependencies [9d1dc6f]
  - @powersync/web@0.6.0
  - @powersync/react@1.3.2

## 0.1.3

### Patch Changes

- @powersync/react@1.3.1
- @powersync/web@0.5.3

## 0.1.2

### Patch Changes

- Updated dependencies [c94be6a]
- Updated dependencies [d62f367]
  - @powersync/react@1.3.0
  - @powersync/web@0.5.2

## 0.1.1

### Patch Changes

- Updated dependencies [9bf5a76]
  - @journeyapps/powersync-react@1.1.0
  - @journeyapps/powersync-sdk-web@0.3.3

## 0.0.1
