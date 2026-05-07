import { createPowerSyncLogger, LogLevels, type PowerSyncLogger } from '@powersync/web';
import { createStorage } from 'unstorage';
import localStorageDriver from 'unstorage/drivers/session-storage';
import mitt from 'mitt';

const emitter = mitt();

const logsStorage = createStorage({
  driver: localStorageDriver({ base: 'powersync:' })
});

/**
 * Provides a logger configured for PowerSync diagnostics.
 *
 * This composable creates a logger instance that is automatically configured for diagnostics
 * recording. The logger stores logs in session storage and emits events for real-time log monitoring.
 *
 * @param additional - Optional logger that messages will also be forwarded to.
 *
 * @returns An object containing:
 * - `logger` - The configured ILogHandler instance
 * - `logsStorage` - Storage instance for log persistence
 * - `emitter` - Event emitter for log events
 *
 * @example
 * ```typescript
 * const { logger } = useDiagnosticsLogger()
 *
 * // Logger is automatically configured for diagnostics
 * // Use it in your PowerSync setup if needed
 * ```
 */
export const useDiagnosticsLogger = (additional?: PowerSyncLogger) => {
  const consoleLogger = createPowerSyncLogger({ minLevel: LogLevels.debug });

  const logger: PowerSyncLogger = {
    async log(level, ...messages) {
      consoleLogger.log(level, ...messages);

      // Storage + emitter
      const messageArray = Array.from(messages);
      const mainMessage = String(messageArray[0] ?? 'Empty log message');
      // Store extra args as-is so objects are shown as JSON in LogsTab
      const extra =
        messageArray.length > 1 ? (messageArray.length === 2 ? messageArray[1] : messageArray.slice(1)) : undefined;
      const logObject = {
        date: new Date(),
        args: [mainMessage, extra]
      };
      const key = `log:${logObject.date.toISOString()}`;
      await logsStorage.set(key, logObject);
      emitter.emit('log', { key, value: logObject });

      // User callback
      additional?.log(level, ...messages);
    }
  };

  return { logger, logsStorage, emitter };
};
