import {
  AbstractStreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  LockOptions,
  LockType
} from '@powersync/common';
import { Mutex } from 'async-mutex';

/**
 * Global locks which prevent multiple instances from syncing
 * concurrently.
 */
const LOCKS = new Map<string, Map<LockType, Mutex>>();

const lockTypes = new Set(Object.values(LockType));

export class NodeStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
  locks: Map<LockType, Mutex>;

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

    this.locks = new Map<LockType, Mutex>();
    this.locks.set(LockType.CRUD, new Mutex());
    this.locks.set(LockType.SYNC, new Mutex());

    if (identifier) {
      LOCKS.set(identifier, this.locks);
    }
  }

  obtainLock<T>(lockOptions: LockOptions<T>): Promise<T> {
    const lock = this.locks.get(lockOptions.type);
    if (!lock) {
      throw new Error(`Lock type ${lockOptions.type} not found`);
    }
    return lock.runExclusive(async () => {
      if (lockOptions.signal?.aborted) {
        throw new Error('Aborted');
      }

      return lockOptions.callback();
    });
  }
}
