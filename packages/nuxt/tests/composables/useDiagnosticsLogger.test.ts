import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useDiagnosticsLogger } from '../../src/runtime/composables/useDiagnosticsLogger';
import { LogLevel, type ILogHandler } from '@powersync/web';
import { withSetup } from '../utils';

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
    const extraPayload = { name: 'TestContext', level: { name: 'INFO' } };
    await logger.log(testMessage, extraPayload as any);

    // Wait for async storage operations
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Get all log keys from storage
    const allKeys = await logsStorage.getKeys();
    const logKeys = allKeys.filter((key: string) => key.startsWith('log:'));

    expect(logKeys.length).toBeGreaterThan(0);

    // Find the log that contains our message (key order may vary)
    let storedLog: { args?: unknown[] } | null = null;
    for (const key of logKeys) {
      const log = (await logsStorage.getItem(key)) as { args?: unknown[] } | null;
      const args = log?.args;
      if (args?.some((arg) => typeof arg === 'string' && arg.includes(testMessage))) {
        storedLog = log;
        break;
      }
    }

    expect(storedLog).toBeDefined();
    expect(storedLog).toHaveProperty('args');
    expect(Array.isArray(storedLog?.args)).toBe(true);
    const logArgs = storedLog?.args as any[];
    expect(logArgs[0]).toBe(testMessage);
    // args[1] is stored as-is (object, not "[object Object]")
    expect(logArgs[1]).toBeDefined();
    expect(logArgs[1]).toHaveProperty('name', 'TestContext');
    expect(logArgs[2]).toBeDefined();
    expect(logArgs[2]).toHaveProperty('level');
  });

  it('should emit log events with correct payload structure', async () => {
    const logEvents: any[] = [];
    const [{ logger, emitter }] = withSetup(() => useDiagnosticsLogger());
    
    // Listen for log events
    emitter.on('log', (event) => {
      logEvents.push(event);
    });
    
    const testMessage = 'Test event message';
    await logger.log(testMessage, { 
      name: 'TestContext', 
      level: { name: 'WARN' } 
    } as any);
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Verify event was emitted with correct structure
    expect(logEvents.length).toBeGreaterThan(0);
    const event = logEvents[0];
    expect(event).toHaveProperty('key');
    expect(event).toHaveProperty('value');
    expect(typeof event.key).toBe('string');
    expect(event.key).toMatch(/^log:/);
    expect(event.value).toBeDefined();
    expect(event.value).toHaveProperty('args');
  });

  it('should call custom handler with correct messages and context', async () => {
    const customHandler = vi.fn<ILogHandler>();
    const [{ logger }] = withSetup(() => useDiagnosticsLogger(customHandler));

    const testMessages = ['Message 1', 'Message 2'];
    const testContext = { name: 'TestContext', level: { name: 'ERROR' } } as any;

    await logger.log(testMessages, testContext);

    // Wait for async handler
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(customHandler).toHaveBeenCalledTimes(1);
    const [messages, context] = customHandler.mock.calls[0];

    const messagesArray = Array.from(messages);
    expect(messagesArray.length).toBeGreaterThan(0);
    // First argument to log() is what we passed (array or string)
    const firstArg = messagesArray[0];
    const hasMessage1 =
      (Array.isArray(firstArg) && firstArg.includes('Message 1')) ||
      (typeof firstArg === 'string' && firstArg.includes('Message 1'));
    expect(hasMessage1).toBe(true);
    // When two args passed to log(), second is in messages (js-logger passes all log args)
    if (messagesArray.length > 1 && typeof messagesArray[1] === 'object' && messagesArray[1]?.name) {
      expect(messagesArray[1].name).toBe('TestContext');
      expect(messagesArray[1].level?.name).toBe('ERROR');
    }
    expect(context).toBeDefined();
    expect(context.level?.name).toBeDefined();
  });

  it('should format messages with PowerSync prefix to console', async () => {
    // js-logger default handler uses console.info for INFO level (logger.log = logger.info)
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const [{ logger }] = withSetup(() => useDiagnosticsLogger());

    const testMessage = 'Test formatted message';
    await logger.log([testMessage, 'Extra data'], {
      name: 'PowerSyncTest',
      level: { name: 'INFO' }
    } as any);

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(consoleSpy).toHaveBeenCalled();
    const hasPowerSyncPrefix = consoleSpy.mock.calls.some((call) => {
      const firstArg = call[0];
      return typeof firstArg === 'string' && firstArg.includes('[PowerSync]');
    });
    expect(hasPowerSyncPrefix).toBe(true);

    consoleSpy.mockRestore();
  });

  it('should store object as extra arg (not "[object Object]")', async () => {
    const [{ logger, logsStorage }] = withSetup(() => useDiagnosticsLogger());

    const payload = { userId: 'u1', synced: true };
    await logger.log('User is logged in', payload);

    await new Promise((resolve) => setTimeout(resolve, 150));

    const allKeys = await logsStorage.getKeys();
    const logKeys = allKeys.filter((key: string) => key.startsWith('log:'));
    expect(logKeys.length).toBeGreaterThan(0);

    const storedLog = (await logsStorage.getItem(logKeys[0])) as { args?: unknown[] } | null;
    const args = storedLog?.args;
    expect(args).toBeDefined();
    expect(args?.length).toBeGreaterThanOrEqual(2);
    expect(args?.[1]).toEqual(payload);
    expect(args?.[1]).not.toBe('[object Object]');
  });

  it('should configure logger with DEBUG level', () => {
    const [{ logger }] = withSetup(() => useDiagnosticsLogger());

    expect(logger.getLevel()).toBe(LogLevel.DEBUG);
  });
});
