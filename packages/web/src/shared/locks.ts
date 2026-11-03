import type { UnlockFn } from '@powersync/shared-internals';

export const getNavigatorLocks = (): LockManager => {
  if ('locks' in navigator && navigator.locks) {
    return navigator.locks;
  }

  throw new Error(
    'Navigator locks are not available in an insecure context. Use a secure context such as HTTPS or http://localhost.'
  );
};

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
export async function generateTabCloseSignal(abort?: AbortSignal): Promise<string> {
  const name = `tab-close-signal-${crypto.randomUUID()}`;
  const releaseLock = await requestNavigatorLock(name, { signal: abort });

  abort?.addEventListener('abort', releaseLock);
  return name;
}

/**
 * Requests a navigator lock, resolving once it has been granted.
 *
 * The lock is held until the returned function is called, or until another context steals it (in which case `onStolen`
 * is invoked).
 */
export function requestNavigatorLock(
  name: string,
  { signal, steal, onStolen }: { signal?: AbortSignal; steal?: boolean; onStolen?: () => void } = {}
): Promise<UnlockFn> {
  return new Promise((resolve, reject) => {
    let granted: { released: boolean } | null = null;

    getNavigatorLocks()
      .request(name, { signal, steal }, (_) => {
        return new Promise<void>((returnLock) => {
          const state = { released: false };
          granted = state;
          resolve(() => {
            state.released = true;
            returnLock();
          });
        });
      })
      .catch((e) => {
        if (granted == null) {
          // Failed to obtain the lock (e.g. because the request was aborted).
          reject(e);
        } else if (!granted.released) {
          // The callback was invoked, but the lock hasn't been released yet. That can only mean that the lock has been
          // stolen from another context.
          onStolen?.();
        }
      });
  });
}
