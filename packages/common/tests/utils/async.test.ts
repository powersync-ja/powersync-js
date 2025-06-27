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

  // This test emphasizes why not to use the 'onabort' property.
  it('should demonstrate that overwriting onabort property supersedes previous onabort logic', async () => {
    const controller = new AbortController();
    const signal = controller.signal;

    // Set up first onabort handler
    const firstHandler = vi.fn();
    signal.onabort = firstHandler;

    // Overwrite onabort property with a second handler
    const secondHandler = vi.fn();
    signal.onabort = secondHandler;

    // Abort the signal
    controller.abort();

    // Only the second handler should be called (first one was overwritten)
    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledTimes(1);
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
