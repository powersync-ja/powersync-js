import { LogLevels } from '@powersync/common';
import {
  AbstractStreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  LockOptions,
  LockType
} from '@powersync/shared-internals';
import { getNavigatorLocks } from '../../shared/navigator.js';

export interface WebStreamingSyncImplementationOptions extends AbstractStreamingSyncImplementationOptions {
  sync?: {
    worker?: string | URL | (() => SharedWorker);
  };
}

export class WebStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
  constructor(options: WebStreamingSyncImplementationOptions) {
    // Super will store and provide default values for options
    super(options);
  }

  get webOptions(): WebStreamingSyncImplementationOptions {
    return this.options as WebStreamingSyncImplementationOptions;
  }

  async obtainLock<T>(lockOptions: LockOptions<T>): Promise<T> {
    const identifier = `streaming-sync-${lockOptions.type}-${this.webOptions.identifier}`;
    if (lockOptions.type == LockType.SYNC) {
      this.logger.log({ level: LogLevels.debug, message: `requesting lock for ${identifier}` });
    }
    return getNavigatorLocks().request(identifier, { signal: lockOptions.signal }, lockOptions.callback);
  }
}
