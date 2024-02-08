import _ from 'lodash';
import {
  AbstractStreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  LockOptions,
  LockType
} from '@journeyapps/powersync-sdk-common';
import { Mutex } from 'async-mutex';

export class SSRStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
  syncMutex: Mutex;
  crudMutex: Mutex;

  constructor(options: AbstractStreamingSyncImplementationOptions) {
    super(options);
    this.syncMutex = new Mutex();
    this.crudMutex = new Mutex();
  }

  obtainLock<T>(lockOptions: LockOptions<T>): Promise<T> {
    const mutex = lockOptions.type == LockType.CRUD ? this.crudMutex : this.syncMutex;
    return mutex.runExclusive(lockOptions.callback);
  }
}
