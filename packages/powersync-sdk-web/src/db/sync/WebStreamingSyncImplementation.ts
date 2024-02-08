import _ from 'lodash';
import {
  AbstractStreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  LockOptions,
  LockType
} from '@journeyapps/powersync-sdk-common';

export interface WebStreamingSyncImplementationOptions extends AbstractStreamingSyncImplementationOptions {}

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
