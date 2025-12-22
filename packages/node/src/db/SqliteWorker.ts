import * as Comlink from 'comlink';
import OS from 'node:os';
import * as path from 'node:path';
import url from 'node:url';
import { parentPort } from 'node:worker_threads';
import { dynamicImport, isBundledToCommonJs } from '../utils/modules.js';
import { AsyncDatabase, AsyncDatabaseOpenOptions, AsyncDatabaseOpener } from './AsyncDatabase.js';
import { openDatabase as openBetterSqliteDatabase } from './BetterSqliteWorker.js';
import { openDatabase as openNodeDatabase } from './NodeSqliteWorker.js';

export interface PowerSyncWorkerOptions {
  /**
   * A function responsible for finding the powersync DLL/so/dylib file.
   *
   * @returns The absolute path of the PowerSync SQLite core extensions library.
   */
  extensionPath: () => string;

  /**
   * A function that returns the `Database` constructor from the `better-sqlite3` package.
   */
  loadBetterSqlite3: () => Promise<any>;
}

/**
 * @returns The relevant PowerSync extension binary filename for the current platform and architecture
 */
export function getPowerSyncExtensionFilename() {
  const platform = OS.platform();
  const arch = OS.arch();
  let extensionFile: string;

  if (platform == 'win32') {
    if (arch == 'x64') {
      extensionFile = 'powersync_x64.dll';
    } else if (arch == 'ia32') {
      extensionFile = 'powersync_x86.dll';
    } else if (arch == 'arm64') {
      extensionFile = 'powersync_aarch64.dll';
    } else {
      throw new Error('Windows platform only supports arm64, ia32 and x64 architecture.');
    }
  } else if (platform == 'linux') {
    if (arch == 'x64') {
      extensionFile = 'libpowersync_x64.linux.so';
    } else if (arch == 'arm64') {
      // TODO detect armv7 as an option
      extensionFile = 'libpowersync_aarch64.linux.so';
    } else if (arch == 'riscv64') {
      extensionFile = 'libpowersync_riscv64gc.linux.so';
    } else {
      throw new Error('Linux platform only supports x64, arm64 and riscv64 architectures.');
    }
  } else if (platform == 'darwin') {
    if (arch == 'x64') {
      extensionFile = 'libpowersync_x64.macos.dylib';
    } else if (arch == 'arm64') {
      extensionFile = 'libpowersync_aarch64.macos.dylib';
    } else {
      throw new Error('macOS platform only supports x64 and arm64 architectures.');
    }
  } else {
    throw new Error(
      `Unknown platform: ${platform}, PowerSync for Node.js currently supports Windows, Linux and macOS.`
    );
  }

  return extensionFile;
}

export function startPowerSyncWorker(options?: Partial<PowerSyncWorkerOptions>) {
  const resolvedOptions: PowerSyncWorkerOptions = {
    extensionPath() {
      const isCommonJsModule = isBundledToCommonJs;
      const extensionFilename = getPowerSyncExtensionFilename();
      let resolved: string;
      if (isCommonJsModule) {
        resolved = path.resolve(__dirname, '../lib/', extensionFilename);
      } else {
        resolved = url.fileURLToPath(new URL(`../${extensionFilename}`, import.meta.url));
      }

      return resolved;
    },
    async loadBetterSqlite3() {
      const module = await dynamicImport('better-sqlite3');
      // require() gives us the default directly, for an ESM import() we need to use the default export.
      return isBundledToCommonJs ? module : module.default;
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
        database = await openBetterSqliteDatabase(this.options, options);
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
