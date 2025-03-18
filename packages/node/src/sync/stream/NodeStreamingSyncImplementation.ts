import {
  AbstractStreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  LockOptions,
  LockType
} from '@powersync/common';
import Lock from 'async-lock';

/**
 * Global locks which prevent multiple instances from syncing
 * concurrently.
 */
const LOCKS = new Map<string, Lock>();

const lockTypes = new Set(Object.values(LockType));

export class NodeStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
  locks: Lock;

  constructor(options: AbstractStreamingSyncImplementationOptions) {
    super(options);
    this.initLocks();
  }

  /**
   *  Configures global locks on sync process
   */
  initLocks() {
    const { identifier } = this.options;
    if (identifier && LOCKS.has(identifier)) {
      this.locks = LOCKS.get(identifier)!;
      return;
    }

    this.locks = new Lock();

    if (identifier) {
      LOCKS.set(identifier, this.locks);
    }
  }

  obtainLock<T>(lockOptions: LockOptions<T>): Promise<T> {
    if (!lockTypes.has(lockOptions.type)) {
      throw new Error(`Lock type ${lockOptions.type} not found`);
    }
    return this.locks.acquire(lockOptions.type, async () => {
      if (lockOptions.signal?.aborted) {
        throw new Error('Aborted');
      }

      return lockOptions.callback();
    });
  }
}
