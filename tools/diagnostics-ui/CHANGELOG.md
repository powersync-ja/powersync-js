# @powersync/diagnostics-ui

## 0.0.5

### Patch Changes

- b65cec1: A host can hide the buttons for some actions, with the `hiddenActions` option or `?hiddenActions=` on the page URL.
- 567c46d: Keep wide Data Inspector results scrolling inside their table.
- b65cec1: A host that has the deployed Sync Config can pass its Sync Streams as `streamDefinitions` in `getInfo`. The Streams tab suggests them in its subscribe form and shows the parameters each one reads.
- 70ee2eb: The Streams tab no longer shows a subscription with a TTL of 0 as expired while it syncs. Its notice is no longer styled as a warning, and says more clearly what subscribing there affects.
- 567c46d: Unsubscribe in the Streams tab now releases a stream subscribed more than once, and works while the stream is inactive.
- Updated dependencies [b65cec1]
  - @powersync/diagnostics-core@0.0.4

## 0.0.4

### Patch Changes

- cd6f786: Show React Native setup steps in the DevTools panel.

## 0.0.3

### Patch Changes

- 7bb0f27: For SDK integrations that support it, display the database path.
- Updated dependencies [6f05fc7]
- Updated dependencies [7bb0f27]
  - @powersync/diagnostics-core@0.0.3

## 0.0.2

### Patch Changes

- 255456b: Initial automated release.
- Updated dependencies [255456b]
  - @powersync/diagnostics-core@0.0.2
