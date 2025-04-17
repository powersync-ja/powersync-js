import { type ILogger, type ILogLevel, LogLevel } from '@powersync/common';
import { type WrappedSyncPort } from './SharedSyncImplementation';

/**
 * Broadcasts logs to all clients
 */
export class BroadcastLogger implements ILogger {
  TRACE: ILogLevel;
  DEBUG: ILogLevel;
  INFO: ILogLevel;
  TIME: ILogLevel;
  WARN: ILogLevel;
  ERROR: ILogLevel;
  OFF: ILogLevel;

  constructor(protected clients: WrappedSyncPort[]) {
    this.TRACE = LogLevel.TRACE;
    this.DEBUG = LogLevel.DEBUG;
    this.INFO = LogLevel.INFO;
    this.TIME = LogLevel.TIME;
    this.WARN = LogLevel.WARN;
    this.ERROR = LogLevel.ERROR;
    this.OFF = LogLevel.OFF;
  }

  trace(...x: any[]): void {
    console.trace(...x);
    const sanitized = this.sanitizeArgs(x);
    this.iterateClients((client) => client.clientProvider.trace(...sanitized));
  }

  debug(...x: any[]): void {
    console.debug(...x);
    const sanitized = this.sanitizeArgs(x);
    this.iterateClients((client) => client.clientProvider.debug(...sanitized));
  }

  info(...x: any[]): void {
    console.info(...x);
    const sanitized = this.sanitizeArgs(x);
    this.iterateClients((client) => client.clientProvider.info(...sanitized));
  }

  log(...x: any[]): void {
    console.log(...x);
    const sanitized = this.sanitizeArgs(x);
    this.iterateClients((client) => client.clientProvider.log(...sanitized));
  }

  warn(...x: any[]): void {
    console.warn(...x);
    const sanitized = this.sanitizeArgs(x);
    this.iterateClients((client) => client.clientProvider.warn(...sanitized));
  }

  error(...x: any[]): void {
    console.error(...x);
    const sanitized = this.sanitizeArgs(x);
    this.iterateClients((client) => client.clientProvider.error(...sanitized));
  }

  time(label: string): void {
    console.time(label);
    this.iterateClients((client) => client.clientProvider.time(label));
  }

  timeEnd(label: string): void {
    console.timeEnd(label);
    this.iterateClients((client) => client.clientProvider.timeEnd(label));
  }

  setLevel(level: ILogLevel): void {
    // Levels are not adjustable on this level.
  }

  getLevel(): ILogLevel {
    // Levels are not adjustable on this level.
    return LogLevel.INFO;
  }

  enabledFor(level: ILogLevel): boolean {
    // Levels are not adjustable on this level.
    return true;
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
  protected sanitizeArgs(x: any[]): any[] {
    const sanitizedParams = x.map((param) => {
      try {
        // Try and clone here first. If it fails it won't be passable over a MessagePort
        return structuredClone(param);
      } catch (ex) {
        console.error(ex);
        return 'Could not serialize log params. Check shared worker logs for more details.';
      }
    });

    return sanitizedParams;
  }
}
