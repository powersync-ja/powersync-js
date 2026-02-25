import { createBaseLogger, LogLevel, type ILogHandler } from '@powersync/web';
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
 * @param customHandler - Optional custom log handler to process log messages
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
export const useDiagnosticsLogger = (customHandler?: ILogHandler) => {
  const logger = createBaseLogger();

  // Console output: use js-logger's default handler (optional formatter for [PowerSync] prefix)
  const consoleHandler = logger.createDefaultHandler({
    formatter: (messages, context) => {
      messages.unshift(`[PowerSync]${context.name ? ` [${context.name}]` : ''}`);
    }
  });

  logger.setLevel(LogLevel.DEBUG);
  logger.setHandler(async (messages, context) => {
    consoleHandler(messages, context);

    // Storage + emitter
    const messageArray = Array.from(messages);
    const mainMessage = String(messageArray[0] ?? 'Empty log message');
    // Store extra args as-is so objects are shown as JSON in LogsTab
    const extra =
      messageArray.length > 1 ? (messageArray.length === 2 ? messageArray[1] : messageArray.slice(1)) : undefined;
    const logObject = {
      date: new Date(),
      type: context.level.name.toLowerCase(),
      args: [mainMessage, extra, context]
    };
    const key = `log:${logObject.date.toISOString()}`;
    await logsStorage.set(key, logObject);
    emitter.emit('log', { key, value: logObject });

    // User callback
    await customHandler?.(messages, context);
  });

  return { logger, logsStorage, emitter };
};
