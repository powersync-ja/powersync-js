export const LogLevels = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50
} as const;

/**
 * A log record passed to a {@link PowerSyncLogger}.
 */
export interface LogRecord {
  /**
   * The log level (see {@link LogLevels} for preconfigured values) for the message. Depending on how a receiving logger
   * has been confired, messages below a configured minimum level may be ignored.
   */
  level: number;
  /**
   * The main message to log.
   */
  message: string;

  /**
   * The (optional) component within the PowerSync SDK logging the message.
   */
  tag?: string;

  /**
   * When the log message contains an error, the error causing the log.
   *
   * This is not guaranteed to be an `Error` instance. On the web, we might have to serialize objects across message
   * channels and represent them as a string.
   */
  error?: unknown;
}

/**
 * A logger used by the PowerSync SDK.
 *
 * This is deliberately a very simple interface, and it's not a designed to be a general-purpose logger you would use in
 * your application. Instead, you can provide an implementation of this to PowerSync to make it use your preferred
 * logging libraries.
 *
 * By default, the SDK uses a {@link createConsoleLogger} instance forwarding messages to `console.log`.
 */
export interface PowerSyncLogger {
  log(record: LogRecord): void;
}

export interface CreateLoggerOptions {
  /**
   * A prefix for messages emitted by {@link createConsoleLogger} to make them more recognizable.
   *
   * Defaults to `'PowerSync'`.
   */
  prefix: string;

  /**
   * The minimum log level to consider for messages. Defaults to {@link LogLevels.info}.
   */
  minLevel: number;
}

/**
 * A very simple {@link PowerSyncLogger} implementation forwarding messages to `console.log`.
 *
 * @param options Options to configure a minimum severity of the logger or a prefix to make messages more recognizable.
 */
export function createConsoleLogger(options?: Partial<CreateLoggerOptions>): PowerSyncLogger & CreateLoggerOptions {
  const { prefix = 'PowerSync', minLevel = LogLevels.info } = options ?? {};

  return {
    prefix,
    minLevel,
    log({ level, message, tag, error }) {
      if (level < this.minLevel) return;

      let emitter = console.log;
      if (level >= LogLevels.info) {
        emitter = console.info;
      } else if (level >= LogLevels.error) {
        emitter = console.error;
      } else if (level >= LogLevels.warn) {
        emitter = console.warn;
      }

      let resolvedPrefix = tag != null ? `${prefix}.${tag}` : prefix;
      const messageWithPrefix = `[${resolvedPrefix}]: ${message}`;

      if (error) {
        emitter(messageWithPrefix, error);
      } else {
        emitter(messageWithPrefix);
      }
    }
  };
}
