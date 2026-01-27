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
    await logger.log(testMessage, { 
      name: 'TestContext', 
      level: { name: 'INFO' } 
    } as any);
    
    // Wait for async storage operations
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Get all log keys from storage
    const allKeys = await logsStorage.getKeys();
    const logKeys = allKeys.filter((key: string) => key.startsWith('log:'));
    
    expect(logKeys.length).toBeGreaterThan(0);
    
    // Verify the stored log content
    const firstLogKey = logKeys[0];
    const storedLog = await logsStorage.getItem(firstLogKey);
    
    expect(storedLog).toBeDefined();
    expect(storedLog).toHaveProperty('args');
    expect(Array.isArray(storedLog?.args)).toBe(true);
    // Check that our message is in the stored log
    const logArgs = storedLog?.args as any[];
    const messageInLog = logArgs.some(arg => 
      typeof arg === 'string' && arg.includes(testMessage)
    );
    expect(messageInLog).toBe(true);
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
    const testContext = { 
      name: 'TestContext', 
      level: { name: 'ERROR' } 
    } as any;
    
    await logger.log(testMessages, testContext);
    
    // Wait for async handler
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Verify custom handler was called with correct arguments
    expect(customHandler).toHaveBeenCalledTimes(1);
    const [messages, context] = customHandler.mock.calls[0];
    
    // messages is an Iterable, not an array - convert it to check contents
    const messagesArray = Array.from(messages);
    expect(messagesArray.length).toBeGreaterThan(0);
    expect(messagesArray[0].includes('Message 1')).toBe(true);
    expect(messagesArray[0].includes('Message 2')).toBe(true);
    const contextError = messagesArray[1];
    expect(contextError.name).toBe('TestContext');
    expect(contextError.level.name).toBe('ERROR');
    expect(context).toBeDefined();
    expect(context.level.name).toBe('INFO');

  });

  it('should format messages correctly for consola with PowerSync prefix', async () => {
    const consolaSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    const [{ logger }] = withSetup(() => useDiagnosticsLogger());
    
    const testMessage = 'Test formatted message';
    await logger.log([testMessage, 'Extra data'], { 
      name: 'PowerSyncTest', 
      level: { name: 'INFO' } 
    } as any);
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Verify consola was called (it uses console.log internally)
    expect(consolaSpy).toHaveBeenCalled();
    
    // Check that the formatted message includes PowerSync prefix
    const consoleCalls = consolaSpy.mock.calls;
    const hasPowerSyncPrefix = consoleCalls.some(call => {
      const args = call[0] as string;
      return typeof args === 'string' && args.includes('[PowerSync]');
    });
    expect(hasPowerSyncPrefix).toBe(true);
    
    consolaSpy.mockRestore();
  });

  it('should configure logger with DEBUG level', () => {
    const [{ logger }] = withSetup(() => useDiagnosticsLogger());
    
    expect(logger.getLevel()).toBe(LogLevel.DEBUG);
  });
});
