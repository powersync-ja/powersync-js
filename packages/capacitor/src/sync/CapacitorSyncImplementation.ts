import { AbstractStreamingSyncImplementation, LockOptions } from '@powersync/web';
import { Mutex } from 'async-mutex';

export class CapacitorStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
  private static mutexMap = new Map<string, Mutex>();

  private getMutex(identifier: string): Mutex {
    let mutex = CapacitorStreamingSyncImplementation.mutexMap.get(identifier);
    if (!mutex) {
      mutex = new Mutex();
      CapacitorStreamingSyncImplementation.mutexMap.set(identifier, mutex);
    }
    return mutex;
  }

  async obtainLock<T>(lockOptions: LockOptions<T>): Promise<T> {
    const identifier = `streaming-sync-${lockOptions.type}-${this.options.identifier}`;
    const mutex = this.getMutex(identifier);

    return mutex.runExclusive(async () => {
      if (lockOptions.signal?.aborted) {
        throw new Error('Aborted');
      }
      return await lockOptions.callback();
    });
  }
}
