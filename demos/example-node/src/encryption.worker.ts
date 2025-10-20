// This worker uses bindings to sqlite3 multiple ciphers instead of the original better-sqlite3 worker.
//
// It is used in main.ts only when an encryption key is set.
import Database from 'better-sqlite3-multiple-ciphers';

import { startPowerSyncWorker } from '@powersync/node/worker.js';

async function resolveBetterSqlite3() {
  return Database;
}

startPowerSyncWorker({ loadBetterSqlite3: resolveBetterSqlite3 });
