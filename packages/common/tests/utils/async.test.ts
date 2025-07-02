import { describe, expect, it, vi } from 'vitest';
import { resolveEarlyOnAbort } from '../../src/utils/async';

describe('resolveEarlyOnAbort', () => {
  it('should resolve early when signal is aborted', async () => {
    const controller = new AbortController();

    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('completed'), 100);
    });

    const racePromise = resolveEarlyOnAbort(slowPromise, controller.signal);

    // Abort after a short delay
    setTimeout(() => controller.abort(), 10);

    const result = await racePromise;
    expect(result).toEqual({ aborted: true });
  });

  it('should resolve immediately if signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(); // Abort before creating the race

    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('completed'), 100);
    });

    const result = await resolveEarlyOnAbort(slowPromise, controller.signal);
    expect(result).toEqual({ aborted: true });
  });

  it('should resolve with the result if the promise resolves before the signal is aborted', async () => {
    const controller = new AbortController();

    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('completed'), 100);
    });

    const result = await resolveEarlyOnAbort(slowPromise, controller.signal);
    expect(result).toEqual({ result: 'completed', aborted: false });
  });

  it('should show that resolveEarlyOnAbort does not interfere with onabort property or other event listeners', async () => {
    const controller = new AbortController();
    let onabortCalled = false;
    let eventListenerCalled = false;

    // Set onabort property
    controller.signal.onabort = () => {
      onabortCalled = true;
    };

    // Add another event listener
    controller.signal.addEventListener('abort', () => {
      eventListenerCalled = true;
    });

    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('completed'), 100);
    });

    const racePromise = resolveEarlyOnAbort(slowPromise, controller.signal);

    // Abort after a short delay
    setTimeout(() => controller.abort(), 10);

    const result = await racePromise;

    expect(result).toEqual({ aborted: true });
    expect(onabortCalled).toBe(true);
    expect(eventListenerCalled).toBe(true);
  });
});
