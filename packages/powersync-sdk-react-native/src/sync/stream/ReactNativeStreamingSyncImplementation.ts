import {
  AbstractStreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  LockOptions,
  LockType
} from '@journeyapps/powersync-sdk-common';
import Lock from 'async-lock';
export class ReactNativeStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
  locks: Map<LockType, Lock>;

  constructor(options: AbstractStreamingSyncImplementationOptions) {
    super(options);
    this.locks = new Map();
    this.locks.set(LockType.CRUD, new Lock());
    this.locks.set(LockType.SYNC, new Lock());
  }

  obtainLock<T>(lockOptions: LockOptions<T>): Promise<T> {
    const lock = this.locks.get(lockOptions.type);
    if (!lock) {
      throw new Error(`Lock type ${lockOptions.type} not found`);
    }
    return lock.acquire(lockOptions.type, async () => {
      if (lockOptions.signal?.aborted) {
        return null;
      }

      return lockOptions.callback();
    });
  }
}
