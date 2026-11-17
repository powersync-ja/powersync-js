# @powersync/diagnostics

## 0.1.1

### Patch Changes

- b65cec1: A host can hide the buttons for some actions, with the `hiddenActions` option or `?hiddenActions=` on the page URL.
- 567c46d: Keep wide Data Inspector results scrolling inside their table.
- b65cec1: A host that has the deployed Sync Config can pass its Sync Streams as `streamDefinitions` in `getInfo`. The Streams tab suggests them in its subscribe form and shows the parameters each one reads.
- 70ee2eb: The Streams tab no longer shows a subscription with a TTL of 0 as expired while it syncs. Its notice is no longer styled as a warning, and says more clearly what subscribing there affects.
- 567c46d: Unsubscribe in the Streams tab now releases a stream subscribed more than once, and works while the stream is inactive.
- Updated dependencies [b65cec1]
- Updated dependencies [567c46d]
- Updated dependencies [b65cec1]
- Updated dependencies [70ee2eb]
- Updated dependencies [567c46d]
  - @powersync/diagnostics-ui@0.0.5
  - @powersync/diagnostics-core@0.0.4

## 0.1.0

### Minor Changes

- cd6f786: Add `@powersync/diagnostics/react-native`: PowerSync DevTools in React Native DevTools as a Rozenite plugin, with agent tools.

### Patch Changes

- cd6f786: Run DevTools SQL that changes data on the write connection, so writes work on Node and React Native.
- Updated dependencies [d937e80]
- Updated dependencies [cd6f786]
- Updated dependencies [aba3d4a]
  - @powersync/web@2.7.0
  - @powersync/diagnostics-ui@0.0.4

## 0.0.3

### Patch Changes

- 6f05fc7: Add a `@powersync/diagnostics/agent` subpath for apps that show DevTools in their own iframe.
- 7bb0f27: For SDK integrations that support it, display the database path.
- 325cb95: Label each app with its database's SDK name, so Capacitor apps show as `@powersync/capacitor` on every platform.
- Updated dependencies [bf54805]
- Updated dependencies [6f05fc7]
- Updated dependencies [325cb95]
- Updated dependencies [109de2c]
- Updated dependencies [9be90b3]
- Updated dependencies [7bb0f27]
- Updated dependencies [d6a9cb4]
- Updated dependencies [d30ad72]
- Updated dependencies [7d5255f]
- Updated dependencies [59f1618]
  - @powersync/web@2.6.0
  - @powersync/diagnostics-core@0.0.3
  - @powersync/common@2.5.0
  - @powersync/diagnostics-ui@0.0.3

## 0.0.2

### Patch Changes

- 255456b: Initial automated release.
- Updated dependencies [544c9ba]
- Updated dependencies [255456b]
- Updated dependencies [fe8ad22]
- Updated dependencies [fe8ad22]
- Updated dependencies [1a209a0]
  - @powersync/web@2.5.0
  - @powersync/diagnostics-core@0.0.2
  - @powersync/diagnostics-ui@0.0.2
  - @powersync/common@2.4.0
