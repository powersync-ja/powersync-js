import { AbstractStreamingSyncImplementation, LockOptions, LockType, mutexRunExclusive } from '@powersync/web';
import { Mutex } from 'async-mutex';

type MutexMap = {
  /**
   * Used to track the consumers of this Mutex.
   * It should be safe to dispose the Mutex if this is empty.
   */
  tracking: Set<number>;
  locks: {
    [Type in LockType]: Mutex;
  };
};

const GLOBAL_MUTEX_STORE: Map<string, MutexMap> = new Map();

/**
 * Used to identify multiple instances of CapacitorStreamingSyncImplementation
 */
let _CAPACITOR_STREAMING_SYNC_SEQUENCE = 0;

export class CapacitorStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
  // A unique ID for tacking this specific instance of CapacitorStreamingSyncImplementation
  protected instanceId = _CAPACITOR_STREAMING_SYNC_SEQUENCE++;

  async dispose(): Promise<void> {
    await super.dispose();

    // Clear up any global mutexes which aren't used anymore
    for (const mutexEntry of GLOBAL_MUTEX_STORE.entries()) {
      const [identifier, mutex] = mutexEntry;
      if (!mutex.tracking.has(this.instanceId)) {
        continue;
      }
      mutex.tracking.delete(this.instanceId);
      if (mutex.tracking.size == 0) {
        GLOBAL_MUTEX_STORE.delete(identifier);
      }
    }
  }

  async obtainLock<T>(lockOptions: LockOptions<T>): Promise<T> {
    // If we don't have an identifier for some reason (should not happen), we use a shared Mutex
    const { identifier: baseIdentifier = 'DEFAULT' } = this.options;
    if (!GLOBAL_MUTEX_STORE.has(baseIdentifier)) {
      GLOBAL_MUTEX_STORE.set(baseIdentifier, {
        tracking: new Set([this.instanceId]),
        locks: {
          [LockType.CRUD]: new Mutex(),
          [LockType.SYNC]: new Mutex()
        }
      });
    }

    const mutex = GLOBAL_MUTEX_STORE.get(baseIdentifier)!.locks[lockOptions.type];

    return mutexRunExclusive(mutex, async () => {
      if (lockOptions.signal?.aborted) {
        throw new Error('Aborted');
      }
      return await lockOptions.callback();
    });
  }
}
