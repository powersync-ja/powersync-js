import * as Comlink from 'comlink';
import { applyWalChanges, DatabaseServer, WalIndexChange, WriteAheadBuffers } from './shared.js';
import { RawQueryResult } from '@powersync/common';
import { InMemoryWriteAheadLog } from './vfs.js';
import { RawSqliteConnection } from '../wa-sqlite/RawSqliteConnection.js';
import { WASQLiteVFS } from '../wa-sqlite/vfs.js';
import { TemporaryStorageOption } from '../options.js';

class MemoryDatabaseServer implements DatabaseServer {
  #vfs!: InMemoryWriteAheadLog;
  #connection!: RawSqliteConnection;

  async open(buffers: WriteAheadBuffers): Promise<void> {
    const { default: factory } = await import('@journeyapps/wa-sqlite/dist/wa-sqlite.mjs');
    const module = await factory();
    const vfs = (this.#vfs = new InMemoryWriteAheadLog(module, buffers));

    const connection = new RawSqliteConnection({
      filename: '/database',
      readonly: false,
      encryptionKey: undefined,
      vfs: WASQLiteVFS.InMemoryVfs,
      temporaryStorage: TemporaryStorageOption.MEMORY,
      cacheSizeKb: 50 * 1024,
      preparedStatementsCache: 32
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

  async takeWalChanges(): Promise<WalIndexChange> {
    return this.#vfs.takeChanges();
  }
}

Comlink.expose(new MemoryDatabaseServer());
