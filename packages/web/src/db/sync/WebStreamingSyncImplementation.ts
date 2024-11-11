import {
  AbstractStreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  LockOptions,
  LockType
} from '@powersync/common';
import { ResolvedWebSQLOpenOptions, WebSQLFlags } from '../adapters/web-sql-flags';
import { getNavigatorLocks } from '../../shared/navigator';

export interface WebStreamingSyncImplementationOptions extends AbstractStreamingSyncImplementationOptions {
  flags?: WebSQLFlags;

  database?: {
    options: {
      worker?: string | URL | ((options: ResolvedWebSQLOpenOptions) => Worker | SharedWorker);
    };
  };
  sync?: {
    worker?: string | URL | ((options: ResolvedWebSQLOpenOptions) => SharedWorker);
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

  obtainLock<T>(lockOptions: LockOptions<T>): Promise<T> {
    const identifier = `streaming-sync-${lockOptions.type}-${this.webOptions.identifier}`;
    lockOptions.type == LockType.SYNC && console.debug('requesting lock for ', identifier);
    return getNavigatorLocks().request(identifier, { signal: lockOptions.signal }, lockOptions.callback);
  }
}
