import {
  AbstractStreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  LockOptions
} from '@powersync/web';
import Lock from 'async-lock';

export class CapacitorStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
  protected lock: Lock;
  constructor(options: AbstractStreamingSyncImplementationOptions) {
    // Super will store and provide default values for options
    super(options);
    this.lock = new Lock();
  }

  async obtainLock<T>(lockOptions: LockOptions<T>): Promise<T> {
    const identifier = `streaming-sync-${lockOptions.type}-${this.options.identifier}`;
    return this.lock.acquire(identifier, async () => {
      if (lockOptions.signal?.aborted) {
        throw new Error('Aborted');
      }
      return await lockOptions.callback();
    });
  }
}
