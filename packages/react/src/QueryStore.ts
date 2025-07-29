import {
  AbstractPowerSyncDatabase,
  WatchCompatibleQuery,
  WatchedQuery,
  WatchedQueryListenerEvent
} from '@powersync/common';
import { DifferentialHookOptions } from './hooks/watched/watch-types';

export function generateQueryKey(
  sqlStatement: string,
  parameters: ReadonlyArray<unknown>,
  options: DifferentialHookOptions<unknown>
): string {
  return `${sqlStatement} -- ${JSON.stringify(parameters)} -- ${JSON.stringify(options)}`;
}

export class QueryStore {
  cache = new Map<string, WatchedQuery<unknown>>();

  constructor(private db: AbstractPowerSyncDatabase) {}

  getQuery<RowType>(key: string, query: WatchCompatibleQuery<RowType[]>, options: DifferentialHookOptions<RowType>) {
    if (this.cache.has(key)) {
      return this.cache.get(key) as WatchedQuery<RowType[]>;
    }

    const watch = options.rowComparator
      ? this.db.customQuery(query).differentialWatch({
          rowComparator: options.rowComparator,
          reportFetching: options.reportFetching,
          throttleMs: options.throttleMs
        })
      : this.db.customQuery(query).watch({
          reportFetching: options.reportFetching,
          throttleMs: options.throttleMs
        });

    this.cache.set(key, watch);

    const disposer = watch.registerListener({
      closed: () => {
        this.cache.delete(key);
        disposer?.();
      }
    });

    watch.listenerMeta.registerListener({
      listenersChanged: (counts) => {
        // Dispose this query if there are no subscribers present
        // We don't use the total here since we don't want to consider `onclose` listeners
        const relevantCounts = [
          WatchedQueryListenerEvent.ON_DATA,
          WatchedQueryListenerEvent.ON_STATE_CHANGE,
          WatchedQueryListenerEvent.ON_ERROR
        ].reduce((sum, event) => {
          return sum + (counts[event] || 0);
        }, 0);

        if (relevantCounts == 0) {
          watch.close();
          this.cache.delete(key);
        }
      }
    });

    return watch;
  }
}

let queryStores: WeakMap<AbstractPowerSyncDatabase, QueryStore> | undefined = undefined;

export function getQueryStore(db: AbstractPowerSyncDatabase): QueryStore {
  queryStores ||= new WeakMap();
  const existing = queryStores.get(db);
  if (existing) {
    return existing;
  }
  const store = new QueryStore(db);
  queryStores.set(db, store);
  return store;
}
