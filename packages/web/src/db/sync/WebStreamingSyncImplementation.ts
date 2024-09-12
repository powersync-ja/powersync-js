import {
  AbstractStreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  LockOptions,
  LockType
} from '@powersync/common';
import { RequiredWebSQLOpenOptions, WebSQLFlags } from '../adapters/web-sql-flags';

export interface WebStreamingSyncImplementationOptions extends AbstractStreamingSyncImplementationOptions {
  flags?: WebSQLFlags;

  database?: {
    options: {
      worker?: string | URL | ((options: RequiredWebSQLOpenOptions) => Worker | SharedWorker);
    };
  };
  sync?: {
    worker?: string | URL | ((options: RequiredWebSQLOpenOptions) => SharedWorker);
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
    return navigator.locks.request(identifier, { signal: lockOptions.signal }, lockOptions.callback);
  }
}
