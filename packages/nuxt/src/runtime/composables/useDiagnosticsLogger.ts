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
