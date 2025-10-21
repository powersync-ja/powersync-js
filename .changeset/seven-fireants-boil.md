---
'@powersync/node': minor
---

Pre-package all the PowerSync Rust extension binaries for all supported platforms and architectures in the NPM package `lib` folder. Install scripts are no longer required to download the PowerSync core.

The binary files relevant to a specific architecture now have updated filenames. Custom code which previously referenced binary filenames requires updating. A helper function is available to automatically provide the correct filename.

```diff
+ import { getPowerSyncExtensionFilename } from '@powersync/node/worker.js';

function resolvePowerSyncCoreExtension() {
-  const platform = OS.platform();
-  let extensionPath: string;
-  if (platform === 'win32') {
-    extensionPath = 'powersync.dll';
-  } else if (platform === 'linux') {
-    extensionPath = 'libpowersync.so';
-  } else if (platform === 'darwin') {
-    extensionPath = 'libpowersync.dylib';
-  } else {
-    throw 'Unknown platform, PowerSync for Node.js currently supports Windows, Linux and macOS.';
-  }
+  const extensionPath = getPowerSyncExtensionFilename();

  // This example uses copy-webpack-plugin to copy the prebuilt library over. This ensures that it is
  // available in packaged release builds.
  let libraryPath = path.resolve(__dirname, 'powersync', extensionPath);
```
