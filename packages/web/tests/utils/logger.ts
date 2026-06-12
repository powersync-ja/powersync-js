import { createConsoleLogger, LogLevels } from '@powersync/web';

// NOTE: This file is imported from iframes and must not import vitest.
export const defaultTestLogger = createConsoleLogger({ prefix: 'test', minLevel: LogLevels.trace });
export const defaultLogLevel = LogLevels.trace;
