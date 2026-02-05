import { AbstractStreamingSyncImplementation, LockOptions } from '@powersync/web';
import Lock from 'async-lock';

export class CapacitorStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
  static GLOBAL_LOCK = new Lock();

  async obtainLock<T>(lockOptions: LockOptions<T>): Promise<T> {
    const identifier = `streaming-sync-${lockOptions.type}-${this.options.identifier}`;
    return CapacitorStreamingSyncImplementation.GLOBAL_LOCK.acquire(identifier, async () => {
      if (lockOptions.signal?.aborted) {
        throw new Error('Aborted');
      }
      return await lockOptions.callback();
    });
  }
}
