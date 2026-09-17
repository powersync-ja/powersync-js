import type { LogRecord } from './shapes.js';

/** The log levels the agent emits, most severe first. */
export const DIAGNOSTICS_LOG_LEVELS = ['error', 'warn', 'info', 'debug', 'trace'] as const;

export type DiagnosticsLogLevel = (typeof DIAGNOSTICS_LOG_LEVELS)[number];

/**
 * A sensible starting selection for a log view: everything but trace. The SDK logs every
 * `powersync_control` call at trace, so it drowns out the rest unless asked for.
 */
export const DEFAULT_DIAGNOSTICS_LOG_LEVELS: readonly DiagnosticsLogLevel[] = ['error', 'warn', 'info', 'debug'];

/** Maps a numeric SDK log level (see the SDK's `LogLevels`) to its name. */
export function logLevelName(level: number): DiagnosticsLogLevel {
  if (level >= 50) return 'error';
  if (level >= 40) return 'warn';
  if (level >= 30) return 'info';
  if (level >= 20) return 'debug';
  return 'trace';
}

/** The agent names every numeric SDK level, so an unrecognised name can only be something even more verbose. */
export const toDiagnosticsLogLevel = (level: string): DiagnosticsLogLevel =>
  DIAGNOSTICS_LOG_LEVELS.find((candidate) => candidate === level) ?? 'trace';

/** A {@link LogRecord} shaped for display: a stable key, a named level, an ISO timestamp and one message. */
export interface DiagnosticsLogEntry {
  key: string;
  level: DiagnosticsLogLevel;
  timestamp: string;
  message: string;
}

const formatArg = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

/**
 * Shapes a log record for display. Error details arrive as `args`; folding them into the message lets
 * a view search and highlight them (error codes, for instance) along with the message text.
 */
export const toLogEntry = (record: LogRecord, index: number): DiagnosticsLogEntry => ({
  // Records carry no id; the buffer is append-only, so a record's position is stable.
  key: `${record.timestamp}-${index}`,
  level: toDiagnosticsLogLevel(record.level),
  timestamp: new Date(record.timestamp).toISOString(),
  message: [record.message, ...(record.args ?? []).map(formatArg)].join('\n')
});

export interface LogEntryFilter {
  /** Only these levels are shown. */
  levels: readonly DiagnosticsLogLevel[];
  /** Case-insensitive text that must appear in the message. */
  search: string;
}

export function filterLogEntries<T extends Pick<DiagnosticsLogEntry, 'level' | 'message'>>(
  entries: readonly T[],
  filter: LogEntryFilter
): T[] {
  const search = filter.search.trim().toLowerCase();
  return entries.filter((entry) => {
    if (!filter.levels.includes(entry.level)) {
      return false;
    }
    return search.length === 0 || entry.message.toLowerCase().includes(search);
  });
}
