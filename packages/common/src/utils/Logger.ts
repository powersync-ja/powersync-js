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

/**
 * Retrieves the base (default) logger instance.
 *
 * This base logger controls the default logging configuration and is shared
 * across all loggers created with `createLogger`. Adjusting settings on this
 * base logger affects all loggers derived from it unless explicitly overridden.
 *
 */
export function createBaseLogger() {
  return Logger;
}

/**
 * Creates and configures a new named logger based on the base logger.
 *
 * Named loggers allow specific modules or areas of your application to have
 * their own logging levels and behaviors. These loggers inherit configuration
 * from the base logger by default but can override settings independently.
 */
export function createLogger(name: string, options: CreateLoggerOptions = {}): ILogger {
  const logger = Logger.get(name);
  if (options.logLevel) {
    logger.setLevel(options.logLevel);
  }

  return logger;
}
