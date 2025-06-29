import { describe, expect, it, vi } from 'vitest';
import { onAbortPromise } from '../../src/utils/async';

describe('onAbortPromise', () => {
  it('should resolve when signal is aborted', async () => {
    const controller = new AbortController();
    const promise = onAbortPromise(controller.signal);

    // Abort the signal after a short delay
    setTimeout(() => controller.abort(), 10);

    // The promise should resolve
    await expect(promise).resolves.toBeUndefined();
  });

  it('should resolve immediately if signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(); // Abort before creating promise

    const promise = onAbortPromise(controller.signal);

    // Should resolve immediately
    await expect(promise).resolves.toBeUndefined();
  });

  it('should show that onAbortPromise does not interfere with onabort property or other event listeners', async () => {
    const controller = new AbortController();
    const signal = controller.signal;

    // Set up onabort property handler
    const onabortHandler = vi.fn();
    signal.onabort = onabortHandler;

    // Set up another event listener
    const eventListenerHandler = vi.fn();
    signal.addEventListener('abort', eventListenerHandler);

    // Create onAbortPromise (which uses addEventListener internally)
    const promise = onAbortPromise(signal);

    // Abort the signal
    controller.abort();

    // All handlers should be called
    expect(onabortHandler).toHaveBeenCalledTimes(1);
    expect(eventListenerHandler).toHaveBeenCalledTimes(1);

    // The promise should also resolve
    await expect(promise).resolves.toBeUndefined();
  });
});
