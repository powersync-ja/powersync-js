import * as path from 'node:path';
import OS from 'node:os';
import Database from 'better-sqlite3';

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
  let libraryPath = path.resolve(__dirname, 'powersync', extensionPath);

  if (__dirname.indexOf('app.asar') != -1) {
    // Our build configuration ensures the extension is always available outside of the archive too.
    libraryPath = libraryPath.replace('app.asar', 'app.asar.unpacked');
  }

  return libraryPath;
}

async function resolveBetterSqlite3() {
  return Database;
}

startPowerSyncWorker({ extensionPath: resolvePowerSyncCoreExtension, loadBetterSqlite3: resolveBetterSqlite3 });
