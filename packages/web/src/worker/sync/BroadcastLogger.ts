import Logger, { type ILogLevel, type ILogger } from 'js-logger';
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

  private currentLevel: ILogLevel = Logger.INFO;

  constructor(protected clients: WrappedSyncPort[]) {
    this.TRACE = Logger.TRACE;
    this.DEBUG = Logger.DEBUG;
    this.INFO = Logger.INFO;
    this.TIME = Logger.TIME;
    this.WARN = Logger.WARN;
    this.ERROR = Logger.ERROR;
    this.OFF = Logger.OFF;
  }

  trace(...x: any[]): void {
    if (!this.enabledFor(this.TRACE)) return;

    console.trace(...x);
    const sanitized = this.sanitizeArgs(x);
    this.iterateClients((client) => client.clientProvider.trace(...sanitized));
  }

  debug(...x: any[]): void {
    if (!this.enabledFor(this.DEBUG)) return;

    console.debug(...x);
    const sanitized = this.sanitizeArgs(x);
    this.iterateClients((client) => client.clientProvider.debug(...sanitized));
  }

  info(...x: any[]): void {
    if (!this.enabledFor(this.INFO)) return;

    console.info(...x);
    const sanitized = this.sanitizeArgs(x);
    this.iterateClients((client) => client.clientProvider.info(...sanitized));
  }

  log(...x: any[]): void {
    if (!this.enabledFor(this.INFO)) return;

    console.log(...x);
    const sanitized = this.sanitizeArgs(x);
    this.iterateClients((client) => client.clientProvider.log(...sanitized));
  }

  warn(...x: any[]): void {
    if (!this.enabledFor(this.WARN)) return;

    console.warn(...x);
    const sanitized = this.sanitizeArgs(x);
    this.iterateClients((client) => client.clientProvider.warn(...sanitized));
  }

  error(...x: any[]): void {
    if (!this.enabledFor(this.ERROR)) return;

    console.error(...x);
    const sanitized = this.sanitizeArgs(x);
    this.iterateClients((client) => client.clientProvider.error(...sanitized));
  }

  time(label: string): void {
    if (!this.enabledFor(this.TIME)) return;

    console.time(label);
    this.iterateClients((client) => client.clientProvider.time(label));
  }

  timeEnd(label: string): void {
    if (!this.enabledFor(this.TIME)) return;

    console.timeEnd(label);
    this.iterateClients((client) => client.clientProvider.timeEnd(label));
  }

  /**
   * Set the global log level.
   */
  setLevel(level: ILogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Get the current log level.
   */
  getLevel(): ILogLevel {
    return this.currentLevel;
  }

  /**
   * Returns true if the given level is enabled.
   */
  enabledFor(level: ILogLevel): boolean {
    return level.value >= this.currentLevel.value;
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
