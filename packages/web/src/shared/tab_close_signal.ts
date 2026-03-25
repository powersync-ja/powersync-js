import { getNavigatorLocks } from './navigator.js';

/**
 * Requests a random lock that will be released once the optional signal is aborted (or, if no signal is given, when the
 * tab is closed).
 *
 * This allows sending the name of the lock to another context (e.g. a shared worker), which will also attempt to
 * acquire it. Since the lock is returned when the tab is closed, this allows the shared worker to free resources
 * assocatiated with this tab.
 *
 *  We take hold of this lock as soon-as-possible in order to cater for potentially closed tabs.
 */
export function generateTabCloseSignal(abort?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const options: LockOptions = { signal: abort };
    getNavigatorLocks()
      .request(`tab-close-signal-${crypto.randomUUID()}`, options, (lock) => {
        resolve(lock!.name);

        return new Promise<void>((resolve) => {
          if (abort) {
            abort.addEventListener('abort', () => resolve());
          }
        });
      })
      .catch(reject);
  });
}
