import * as Comlink from 'comlink';
import { AsyncDatabaseConnection, OnTableChangeCallback } from './AsyncDatabaseConnection';

/**
 * @internal
 * Proxies an {@link AsyncDatabaseConnection} which allows for registering table change notification
 * callbacks over a worker channel
 */
export function ProxiedAsyncDatabaseConnection(base: AsyncDatabaseConnection) {
  return new Proxy(base, {
    get(target, prop: keyof AsyncDatabaseConnection, receiver) {
      const original = Reflect.get(target, prop, receiver);
      if (typeof original === 'function' && prop === 'registerOnTableChange') {
        return function (callback: OnTableChangeCallback) {
          return base.registerOnTableChange(Comlink.proxy(callback));
        };
      }
      return original;
    }
  });
}
