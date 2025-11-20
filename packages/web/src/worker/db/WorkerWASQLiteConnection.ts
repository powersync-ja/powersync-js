import * as Comlink from 'comlink';
import { OnTableChangeCallback } from '../../db/adapters/AsyncDatabaseConnection';
import { WASqliteConnection } from '../../db/adapters/wa-sqlite/WASQLiteConnection';

/**
 * A Small proxy wrapper around the WASqliteConnection.
 * This ensures that certain return types are properly proxied.
 */
export class WorkerWASQLiteConnection extends WASqliteConnection {
  async registerOnTableChange(callback: OnTableChangeCallback): Promise<() => void> {
    // Proxy the callback remove function
    return Comlink.proxy(await super.registerOnTableChange(callback));
  }
}
