import { Mutex } from 'async-mutex';

/**
 * Wrapper for async-mutex runExclusive, which allows for a timeout on each exclusive lock.
 */
export async function mutexRunExclusive<T>(
  mutex: Mutex,
  callback: () => Promise<T>,
  options?: { timeoutMs: number }
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = options?.timeoutMs;
    let timedOut = false;
    const timeoutId = timeout
      ? setTimeout(() => {
          timedOut = true;
          reject(new Error('Timeout waiting for lock'));
        }, timeout)
      : undefined;

    mutex.runExclusive(async () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (timedOut) return;

      try {
        resolve(await callback());
      } catch (ex) {
        reject(ex);
      }
    });
  });
}
