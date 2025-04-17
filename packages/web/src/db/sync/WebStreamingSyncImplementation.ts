import {
  AbstractStreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  LockOptions,
  LockType
} from '@powersync/common';
import { getNavigatorLocks } from '../../shared/navigator';
import { ResolvedWebSQLOpenOptions, WebSQLFlags } from '../adapters/web-sql-flags';
import Logger from 'js-logger';

export interface WebStreamingSyncImplementationOptions extends AbstractStreamingSyncImplementationOptions {
  flags?: WebSQLFlags;
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
    if (lockOptions.type == LockType.SYNC) {
      (this.logger ?? Logger.get('WebStreamingSyncImplementation')).debug('requesting lock for ', identifier);
    }
    return getNavigatorLocks().request(identifier, { signal: lockOptions.signal }, lockOptions.callback);
  }
}
