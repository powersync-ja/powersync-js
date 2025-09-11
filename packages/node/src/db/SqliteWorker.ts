import * as path from 'node:path';
import * as Comlink from 'comlink';
import { parentPort } from 'node:worker_threads';
import OS from 'node:os';
import url from 'node:url';
import { openDatabase as openBetterSqliteDatabase } from './BetterSqliteWorker.js';
import { openDatabase as openNodeDatabase } from './NodeSqliteWorker.js';
import { AsyncDatabase, AsyncDatabaseOpener, AsyncDatabaseOpenOptions } from './AsyncDatabase.js';
import { isBundledToCommonJs } from '../utils/modules.js';

export interface PowerSyncWorkerOptions {
  /**
   * A function responsible for finding the powersync DLL/so/dylib file.
   *
   * @returns The absolute path of the PowerSync SQLite core extensions library.
   */
  extensionPath: () => string;
}

export function startPowerSyncWorker(options?: Partial<PowerSyncWorkerOptions>) {
  const resolvedOptions: PowerSyncWorkerOptions = {
    extensionPath() {
      const isCommonJsModule = isBundledToCommonJs;

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

      let resolved: string;
      if (isCommonJsModule) {
        resolved = path.resolve(__dirname, '../lib/', extensionPath);
      } else {
        resolved = url.fileURLToPath(new URL(`../${extensionPath}`, import.meta.url));
      }

      return resolved;
    },
    ...options
  };

  Comlink.expose(new DatabaseOpenHelper(resolvedOptions), parentPort! as Comlink.Endpoint);
}

class DatabaseOpenHelper implements AsyncDatabaseOpener {
  private options: PowerSyncWorkerOptions;

  constructor(options: PowerSyncWorkerOptions) {
    this.options = options;
  }

  async open(options: AsyncDatabaseOpenOptions): Promise<AsyncDatabase> {
    let database: AsyncDatabase;

    const implementation = options.implementation;
    switch (implementation.type) {
      case 'better-sqlite3':
        database = await openBetterSqliteDatabase(this.options, options, implementation.package ?? 'better-sqlite3');
        break;
      case 'node:sqlite':
        database = await openNodeDatabase(this.options, options);
        break;
      default:
        throw new Error(`Unknown database implementation: ${options.implementation}.`);
    }

    return Comlink.proxy(database);
  }
}
