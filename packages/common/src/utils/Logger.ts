export const LogLevels = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50
} as const;

/**
 * A logger used by the PowerSync SDK.
 *
 * This is deliberately a very simple interface, and it's not a designed to be a general-purpose logger you would use in
 * your application. Instead, you can provide an implementation of this to PowerSync to make it use your preferred
 * logging libraries.
 *
 * By default, the SDK uses a {@link createPowerSyncLogger} instance forwarding messages to `console.log`.
 */
export interface PowerSyncLogger {
  /**
   * Log a message.
   *
   * @param level The log level (see {@link LogLevels} for preconfigured values) for the message. Depending on how the
   * logger has been confired, messages below a configured minimum level may be ignored.
   * @param message Components of the message to log. Components aren't necessarily strings.
   */
  log(level: number, ...message: any[]): void;
}

export interface CreateLoggerOptions {
  /**
   * A prefix for messages emitted by {@link createPowerSyncLogger} to make them more recognizable.
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
export function createPowerSyncLogger(options?: Partial<CreateLoggerOptions>): PowerSyncLogger & CreateLoggerOptions {
  const { prefix = 'PowerSync', minLevel = LogLevels.info } = options ?? {};

  return {
    prefix,
    minLevel,
    log(level, ...message) {
      if (level < this.minLevel) return;

      let emitter = console.log;
      if (level >= LogLevels.error) {
        emitter = console.error;
      } else if (level >= LogLevels.warn) {
        emitter = console.warn;
      }

      emitter(this.prefix, ...message);
    }
  };
}
