import * as path from 'node:path';
import OS from 'node:os';

import { startPowerSyncWorker } from '@powersync/node/worker.js';

function resolvePowerSyncCoreExtension() {
  const platform = OS.platform();
  let extensionPath: string;
  if (platform === 'win32') {
    extensionPath = 'powersync.dll';
  } else if (platform === 'linux') {
    extensionPath = 'libpowersync.so';
  } else if (platform === 'darwin') {
    extensionPath = 'libpowersync.dylib';
  } else {
    throw 'Unknown platform, PowerSync for Node.js currently supports Windows, Linux and macOS.';
  }

  // This example uses copy-webpack-plugin to copy the prebuilt library over. This ensures that it is
  // available in packaged release builds.
  return path.resolve(__dirname, extensionPath);
}

startPowerSyncWorker({ extensionPath: resolvePowerSyncCoreExtension });
