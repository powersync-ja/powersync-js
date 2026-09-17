import { describe, expect, it } from 'vitest';

import {
  DIAGNOSTICS_LOG_LEVELS,
  filterLogEntries,
  logLevelName,
  toDiagnosticsLogLevel,
  toLogEntry
} from '../src/log-levels';
import type { LogRecord } from '../src/shapes';

const record = (level: string, message: string, args?: unknown[]): LogRecord => ({
  timestamp: 1_700_000_000_000,
  level,
  message,
  args
});

const entries = [
  record('debug', 'Opening connection'),
  record('info', 'Connected to endpoint'),
  record('warn', 'Retrying after error', [{ code: 'PSYNC_S2305' }]),
  record('error', 'Upload failed'),
  record('trace', 'Something verbose')
].map(toLogEntry);

describe('logLevelName', () => {
  it('names the SDK numeric levels, treating anything below debug as trace', () => {
    expect([10, 20, 30, 40, 50].map(logLevelName)).toEqual(['trace', 'debug', 'info', 'warn', 'error']);
    expect(logLevelName(0)).toBe('trace');
    expect(logLevelName(45)).toBe('warn');
  });
});

describe('toDiagnosticsLogLevel', () => {
  it('keeps every level the agent emits, trace included', () => {
    for (const level of DIAGNOSTICS_LOG_LEVELS) {
      expect(toDiagnosticsLogLevel(level)).toBe(level);
    }
  });

  it('treats an unrecognised level as trace', () => {
    expect(toDiagnosticsLogLevel('custom')).toBe('trace');
  });
});

describe('toLogEntry', () => {
  it('converts the epoch timestamp to ISO and folds args into the message', () => {
    const entry = toLogEntry(record('error', 'Sync failed', ['PSYNC_S2305: too many buckets']), 3);
    expect(entry).toEqual({
      key: '1700000000000-3',
      level: 'error',
      timestamp: '2023-11-14T22:13:20.000Z',
      message: 'Sync failed\nPSYNC_S2305: too many buckets'
    });
  });

  it('leaves the message alone when there are no args', () => {
    expect(toLogEntry(record('info', 'Connected'), 0).message).toBe('Connected');
  });
});

describe('filterLogEntries', () => {
  it('keeps only the selected levels', () => {
    expect(filterLogEntries(entries, { levels: ['warn', 'error'], search: '' }).map((entry) => entry.message)).toEqual([
      'Retrying after error\n{"code":"PSYNC_S2305"}',
      'Upload failed'
    ]);
  });

  it('hides trace records when trace is deselected', () => {
    expect(filterLogEntries(entries, { levels: ['trace'], search: '' }).map((entry) => entry.message)).toEqual([
      'Something verbose'
    ]);
    expect(filterLogEntries(entries, { levels: ['debug'], search: '' }).map((entry) => entry.message)).toEqual([
      'Opening connection'
    ]);
  });

  it('matches the search against the whole message, ignoring case', () => {
    const allLevels = DIAGNOSTICS_LOG_LEVELS;
    expect(filterLogEntries(entries, { levels: allLevels, search: 'CONNECT' }).map((entry) => entry.message)).toEqual([
      'Opening connection',
      'Connected to endpoint'
    ]);
    expect(filterLogEntries(entries, { levels: allLevels, search: 'psync_s2305' })).toHaveLength(1);
  });
});
