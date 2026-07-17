import * as Comlink from 'comlink';
import { DatabaseServer, WalIndexChange, WriteAheadBuffers } from './shared.js';
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
    currentState.fileSize = overlay.fileSize;
    currentState.walEnd = overlay.walEnd;

    if (overlay.cleared) {
      currentState.overlay.clear();
    }

    for (let i = 0; i < overlay.added.length; i += 2) {
      const dbOffset = overlay.added[i];
      const walOffset = overlay.added[i + 1];
      currentState.overlay.set(dbOffset, walOffset);
    }
  }

  async executeRaw(query: string, params?: any[] | undefined): Promise<RawQueryResult> {
    const results = await this.#connection.executeRaw(query, params);
    return results[0];
  }

  async takeWalChanges(): Promise<WalIndexChange> {
    return this.#vfs.takeChanges();
  }
}

Comlink.expose(new MemoryDatabaseServer());
