import { PowerSyncLogger, LogLevels, CreateLoggerOptions, createConsoleLogger, LogRecord } from '@powersync/common';
import { type WrappedSyncPort } from './SharedSyncImplementation.js';

/**
 * Broadcasts logs to all clients
 */
export class BroadcastLogger implements PowerSyncLogger {
  private readonly inner: PowerSyncLogger & CreateLoggerOptions;
  private currentLevel: number = LogLevels.info;

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

  /**
   * Guards against any logging errors.
   * We don't want a logging exception to cause further issues upstream
   */
  protected sanitizeRecord(record: LogRecord): LogRecord {
    if (!record.error) {
      return record;
    }

    let error;
    try {
      // Try and clone here first. If it fails it won't be passable over a MessagePort
      error = structuredClone(record.error);
    } catch (ex) {
      console.error(ex);
      error = 'Could not serialize log params. Check shared worker logs for more details.';
    }

    return {
      ...record,
      error
    };
  }
}
