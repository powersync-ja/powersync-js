import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { useDiagnosticsLogger } from '../../src/runtime/composables/useDiagnosticsLogger';
import { withSetup } from '../utils';
import { LogLevels, type LogRecord, type PowerSyncLogger } from '@powersync/common';

describe('useDiagnosticsLogger', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should store logs in sessionStorage with correct keys and content', async () => {
    const [{ logger, logsStorage }] = withSetup(() => useDiagnosticsLogger());

    const testMessage = 'Test log message for storage';
    await logger.log({ level: LogLevels.info, message: testMessage });

    // Wait for async storage operations
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Get all log keys from storage
    const allKeys = await logsStorage.getKeys();
    const logKeys = allKeys.filter((key: string) => key.startsWith('log:'));

    expect(logKeys.length).toBeGreaterThan(0);

    // Find the log that contains our message (key order may vary)
    let storedLog: { message: string } | null = null;
    for (const key of logKeys) {
      const log = (await logsStorage.getItem(key)) as { message: string };
      if (log.message.indexOf(testMessage) >= 0) {
        storedLog = log;
        break;
      }
    }

    expect(storedLog).toMatchObject({
      level: 'INFO',
      message: testMessage
    });
  });

  it('should emit log events with correct payload structure', async () => {
    const logEvents: any[] = [];
    const [{ logger, emitter }] = withSetup(() => useDiagnosticsLogger());

    // Listen for log events
    emitter.on('log', (event) => {
      logEvents.push(event);
    });

    const testMessage = 'Test event message';
    await logger.log({
      message: testMessage,
      level: LogLevels.warn
    } as any);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Verify event was emitted with correct structure
    expect(logEvents.length).toBeGreaterThan(0);
    const event = logEvents[0];
    expect(event.value).toMatchObject({
      message: testMessage,
      level: 'WARNING'
    });
  });

  it('should call custom handler with correct messages and context', async () => {
    const log = vi.fn((_record: LogRecord) => {});
    const [{ logger }] = withSetup(() => useDiagnosticsLogger({ log }));

    await logger.log({ level: LogLevels.warn, message: 'Message 1' });

    // Wait for async handler
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(log).toHaveBeenCalledTimes(1);
    const [record] = log.mock.calls[0];

    expect(record).toStrictEqual({ level: LogLevels.warn, message: 'Message 1' });
  });

  it('should format messages with PowerSync prefix to console', async () => {
    // createConsoleLogger uses console.info for INFO level (logger.log = logger.info)
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const [{ logger }] = withSetup(() => useDiagnosticsLogger());

    const testMessage = 'Test formatted message';
    await logger.log({ message: testMessage, level: LogLevels.info });

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls.map((call) => call[0])).toEqual(
      expect.arrayContaining([expect.stringContaining('[PowerSync]')])
    );

    consoleSpy.mockRestore();
  });
});
