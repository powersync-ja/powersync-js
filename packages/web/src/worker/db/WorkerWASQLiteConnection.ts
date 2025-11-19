import * as Comlink from 'comlink';
import { AsyncDatabaseConnection, OnTableChangeCallback } from '../../db/adapters/AsyncDatabaseConnection';
import { WASqliteConnection } from '../../db/adapters/wa-sqlite/WASQLiteConnection';

/**
 * Fully proxies a WASQLiteConnection to be used as an AsyncDatabaseConnection.
 */
export function proxyWASQLiteConnection(connection: AsyncDatabaseConnection): AsyncDatabaseConnection {
  return Comlink.proxy({
    init: Comlink.proxy(() => connection.init()),
    close: Comlink.proxy(() => connection.close()),
    markHold: Comlink.proxy(() => connection.markHold()),
    releaseHold: Comlink.proxy((holdId: string) => connection.releaseHold(holdId)),
    execute: Comlink.proxy((sql: string, params?: any[]) => connection.execute(sql, params)),
    executeRaw: Comlink.proxy((sql: string, params?: any[]) => connection.executeRaw(sql, params)),
    executeBatch: Comlink.proxy((sql: string, params?: any[]) => connection.executeBatch(sql, params)),
    registerOnTableChange: Comlink.proxy((callback: OnTableChangeCallback) =>
      connection.registerOnTableChange(callback)
    ),
    getConfig: Comlink.proxy(() => connection.getConfig())
  });
}

export class WorkerWASQLiteConnection extends WASqliteConnection {
  async registerOnTableChange(callback: OnTableChangeCallback): Promise<() => void> {
    // Proxy the callback remove function
    return Comlink.proxy(await super.registerOnTableChange(callback));
  }
}
