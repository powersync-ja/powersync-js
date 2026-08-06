import * as Comlink from 'comlink';
import { applyWalChanges, DatabaseServer, WalIndexChange, WriteAheadBuffers } from './shared.js';
import { RawQueryResult } from '@powersync/common';
import { InMemoryWriteAheadLog } from './vfs.js';
import { RawSqliteConnection, RawWaSqliteDatabaseOptions, RawWebResult } from '../wa-sqlite/RawSqliteConnection.js';
import { WASQLiteVFS } from '../wa-sqlite/vfs.js';
import { TemporaryStorageOption } from '../options.js';

class MemoryDatabaseServer implements DatabaseServer {
  #vfs!: InMemoryWriteAheadLog;
  #connection!: RawSqliteConnection;

  async open(buffers: WriteAheadBuffers, options: Partial<RawWaSqliteDatabaseOptions>): Promise<void> {
    const { default: factory } = await import('@journeyapps/wa-sqlite/dist/wa-sqlite.mjs');
    const module = await factory();
    const vfs = (this.#vfs = new InMemoryWriteAheadLog(module, buffers));

    const connection = new RawSqliteConnection({
      encryptionKey: undefined,
      vfs: WASQLiteVFS.InMemoryVfs,
      temporaryStorage: TemporaryStorageOption.MEMORY,
      cacheSizeKb: 50 * 1024,
      preparedStatementsCache: 0,
      ...options,
      // The rest of these options is not overridable: The VFS handles /database reads and writes in a special way and
      // there can only be one database per buffers instance.
      filename: '/database',
      readonly: false
    });
    await connection.initWithModule(module, vfs);
    this.#connection = connection;
  }

  async updateWalState(overlay: WalIndexChange): Promise<void> {
    const currentState = this.#vfs.writeAheadState;
    applyWalChanges(currentState, overlay);
  }

  async executeRaw(query: string, params?: any[] | undefined): Promise<RawQueryResult> {
    return await this.#connection.execute(query, params);
  }

  async executeBatch(query: string, params: any[][]): Promise<RawWebResult[]> {
    return await this.#connection.executeBatch(query, params);
  }

  async takeWalChanges(): Promise<WalIndexChange> {
    return this.#vfs.takeChanges();
  }
}

Comlink.expose(new MemoryDatabaseServer());
