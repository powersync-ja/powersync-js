import Logger, { ILogLevel, ILogger } from 'js-logger';
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
    this.TRACE = Logger.TRACE;
    this.DEBUG = Logger.DEBUG;
    this.INFO = Logger.INFO;
    this.TIME = Logger.TIME;
    this.WARN = Logger.WARN;
    this.ERROR = Logger.ERROR;
    this.OFF = Logger.OFF;
  }

  trace(...x: any[]): void {
    console.trace(x);
    this.clients.forEach((p) => p.clientProvider.trace(x));
  }

  debug(...x: any[]): void {
    console.debug(x);
    this.clients.forEach((p) => p.clientProvider.debug(x));
  }

  info(...x: any[]): void {
    console.info(x);
    this.clients.forEach((p) => p.clientProvider.info(x));
  }

  log(...x: any[]): void {
    console.log(x);
    this.clients.forEach((p) => p.clientProvider.log(x));
  }

  warn(...x: any[]): void {
    console.warn(x);
    this.clients.forEach((p) => p.clientProvider.warn(x));
  }

  error(...x: any[]): void {
    console.error(x);
    this.clients.forEach((p) => p.clientProvider.error(x));
  }

  time(label: string): void {
    console.time(label);
    this.clients.forEach((p) => p.clientProvider.time(label));
  }

  timeEnd(label: string): void {
    console.timeEnd(label);
    this.clients.forEach((p) => p.clientProvider.timeEnd(label));
  }

  setLevel(level: ILogLevel): void {
    // Levels are not adjustable on this level.
  }

  getLevel(): ILogLevel {
    // Levels are not adjustable on this level.
    return Logger.INFO;
  }

  enabledFor(level: ILogLevel): boolean {
    // Levels are not adjustable on this level.
    return true;
  }
}
