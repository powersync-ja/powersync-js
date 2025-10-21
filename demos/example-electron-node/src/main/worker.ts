import Database from 'better-sqlite3';
import * as path from 'node:path';

import { getPowerSyncExtensionFilename, startPowerSyncWorker } from '@powersync/node/worker.js';

function resolvePowerSyncCoreExtension() {
  const extensionFilename = getPowerSyncExtensionFilename();

  // This example uses copy-webpack-plugin to copy the prebuilt library over. This ensures that it is
  // available in packaged release builds.
  let libraryPath = path.resolve(__dirname, 'powersync', extensionFilename);

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
