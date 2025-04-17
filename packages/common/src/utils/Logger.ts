import Logger, { type ILogger, type ILogLevel } from 'js-logger';

export { GlobalLogger, ILogger, ILoggerOpts, ILogHandler, ILogLevel } from 'js-logger';

const TypedLogger: ILogger = Logger as any;

export const LogLevel = {
  TRACE: TypedLogger.TRACE,
  DEBUG: TypedLogger.DEBUG,
  INFO: TypedLogger.INFO,
  TIME: TypedLogger.TIME,
  WARN: TypedLogger.WARN,
  ERROR: TypedLogger.ERROR,
  OFF: TypedLogger.OFF
};

export interface CreateLoggerOptions {
  logLevel?: ILogLevel;
}

export function createBaseLogger() {
  return Logger;
}

export function createLogger(name: string, options: CreateLoggerOptions = {}): ILogger {
  const logger = Logger.get(name);
  if (options.logLevel) {
    logger.setLevel(options.logLevel);
  }

  return logger;
}
