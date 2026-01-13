import { createBaseLogger, LogLevel, type ILogHandler } from '@powersync/web'
import { createConsola, type LogType } from 'consola'
import { createStorage } from 'unstorage'
import localStorageDriver from 'unstorage/drivers/session-storage'
import mitt from 'mitt'

const emitter = mitt()

const logsStorage = createStorage({
  driver: localStorageDriver({ base: 'powersync:' }),
})

const consola = createConsola({
  level: 5, // trace
  fancy: true,
  formatOptions: {
    columns: 80,
    colors: true,
    compact: false,
    date: true,
  },
})

consola.addReporter({
  log: async (logObject) => {
    const key = `log:${logObject.date.toISOString()}`
    await logsStorage.set(key, logObject)
    emitter.emit('log', { key, value: logObject })
  },
})

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
  const logger = createBaseLogger()
  logger.useDefaults()
  logger.setLevel(LogLevel.DEBUG)

  logger.setHandler(async (messages, context) => {
    const level = context.level.name
    const messageArray = Array.from(messages)
    const mainMessage = String(messageArray[0] || 'Empty log message')
    const extraData = messageArray.slice(1).map(item => item.toString()).join(' ')

    consola[level.toLowerCase() as LogType](`[PowerSync] ${context.name ? `[${context.name}]` : ''} ${mainMessage}`, extraData, context)
    // user defined callback
    await customHandler?.(messages, context)
  })

  return { logger, logsStorage, emitter }
}
