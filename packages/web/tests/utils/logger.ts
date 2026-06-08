import { createConsoleLogger, LogLevels } from '@powersync/web';

// NOTE: This file is imported from iframes and must not import vitest.
export const defaultLoggerConfig = {
  logLevel: LogLevels.trace,
  logger: createConsoleLogger({ prefix: 'test', minLevel: LogLevels.trace })
};
