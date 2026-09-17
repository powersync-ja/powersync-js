import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SdkIntegration } from '../src/integration';
import { DiagnosticsRequestTimeoutError, withRequestTimeout } from '../src/timeout';

/** An integration whose requests never answer: the other side of a bridge has gone. */
const gone: SdkIntegration = {
  runQuery: () => new Promise(() => {}),
  getSchema: () => new Promise(() => {}),
  getInfo: () => new Promise(() => {}),
  currentSyncStatus: () => new Promise(() => {}),
  getUploadQueueStats: () => new Promise(() => {}),
  action: () => new Promise(() => {}),
  observeEvents: () => new Promise(() => {}),
  close: async () => {}
};

describe('withRequestTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fails a request that is not answered in time, naming the call', async () => {
    const integration = withRequestTimeout(gone, { timeoutMs: 1000 });
    const request = integration.runQuery({ sql: 'SELECT 1' });
    const failure = expect(request).rejects.toBeInstanceOf(DiagnosticsRequestTimeoutError);

    await vi.advanceTimersByTimeAsync(1000);
    await failure;
    await expect(request).rejects.toMatchObject({ method: 'runQuery', timeoutMs: 1000 });
  });

  it('passes an answer through untouched, and clears its timer', async () => {
    const answering: SdkIntegration = { ...gone, getInfo: async () => ({ endpoint: 'e' }) as never };
    const integration = withRequestTimeout(answering, { timeoutMs: 1000 });

    await expect(integration.getInfo()).resolves.toEqual({ endpoint: 'e' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('passes a failure through as it is', async () => {
    const failing: SdkIntegration = { ...gone, action: async () => Promise.reject(new Error('no such stream')) };
    const integration = withRequestTimeout(failing, { timeoutMs: 1000 });

    await expect(integration.action({ action: 'disconnect' })).rejects.toThrow('no such stream');
  });

  it('bounds subscribing but not the events, and never bounds close', async () => {
    let handler: ((event: never) => void) | undefined;
    const integration = withRequestTimeout(
      {
        ...gone,
        observeEvents: async (next) => {
          handler = next as never;
          return () => {};
        },
        close: () => new Promise(() => {})
      },
      { timeoutMs: 1000 }
    );

    await integration.observeEvents(() => {});
    expect(handler).toBeDefined();

    // Nothing was armed for the events, and close() is left to its own devices.
    void integration.close();
    expect(vi.getTimerCount()).toBe(0);
  });
});
