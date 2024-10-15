import { Mutex } from 'async-mutex';

export const getNavigationLocks = (): LockManager => {
  if ('locks' in navigator && navigator.locks) {
    return navigator.locks;
  }
  console.warn('Navigator locks are not available in this context.' +
                'This may be due to running in an unsecure context. ' +
                'Consider using HTTPS or a secure context for full functionality.' +
                'Using fallback implementation.');

  const mutexes = new Map<string, Mutex>();

  const getMutex = (name: string): Mutex => {
    if (!mutexes.has(name)) {
      mutexes.set(name, new Mutex());
    }
    return mutexes.get(name)!;
  };

  const fallbackLockManager: LockManager = {
    request: async (
      name: string,
      optionsOrCallback: LockOptions | LockGrantedCallback,
      maybeCallback?: LockGrantedCallback
    ): Promise<LockManagerSnapshot> => {
      const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback!;
      const options: LockOptions = typeof optionsOrCallback === 'object' ? optionsOrCallback : {};

      const mutex = getMutex(name);
      const release = await mutex.acquire();
      try {
        const lock: Lock = { name, mode: options.mode || 'exclusive' };
        return await callback(lock);
      } finally {
        release();
        mutexes.delete(name);
      }
    },

    query: async (): Promise<LockManagerSnapshot> => {
      return {
        held: Array.from(mutexes.keys()).map(name => ({ name, mode: 'exclusive' as const })),
        pending: [] // We can't accurately track pending locks in this implementation as this requires a queue
      };
    }
  };

  return fallbackLockManager;
}
