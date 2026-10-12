import { PowerSyncLogger, LogLevels, CreateLoggerOptions, createConsoleLogger, LogRecord } from '@powersync/common';
import { serializeErrorForRelay } from '@powersync/shared-internals';
import { type WrappedSyncPort } from './SharedSyncImplementation.js';

/**
 * Broadcasts logs to all clients
 */
export class BroadcastLogger implements PowerSyncLogger {
  private readonly inner: PowerSyncLogger & CreateLoggerOptions;
  private currentLevel: number = LogLevels.info;

  private sequence = 0;

  sendBroadcasts = true;

  constructor(
    prefix: string,
    private clients: WrappedSyncPort[]
  ) {
    this.inner = createConsoleLogger({ prefix: prefix });
  }

  log(record: LogRecord) {
    this.inner.log(record);

    if (this.sendBroadcasts && record.level >= this.currentLevel) {
      const sanitized = this.sanitizeRecord(record);
      this.iterateClients((client) => client.clientProvider.log(sanitized));
    }
  }

  /**
   * Set the global log level.
   */
  setLevel(level: number): void {
    this.inner.minLevel = level;
    this.currentLevel = level;
  }

  /**
   * Iterates all clients, catches individual client exceptions
   * and proceeds to execute for all clients.
   */
  protected async iterateClients(callback: (client: WrappedSyncPort) => Promise<void>) {
    for (const client of this.clients) {
      try {
        await callback(client);
      } catch (ex) {
        console.error('Caught exception when iterating client', ex);
      }
    }
  }

  protected sanitizeRecord(record: LogRecord): LogRecord {
    // Preserve explicit undefined rejection reasons.
    if (!('error' in record)) {
      return record;
    }

    const serialized = serializeErrorForRelay(record.error);
    return {
      ...record,
      error: {
        ...serialized,
        relay: {
          origin: 'shared-sync-worker',
          sequence: this.sequence++,
          errorState: serialized.state,
          relayedAt: new Date().toISOString()
        }
      }
    };
  }
}
