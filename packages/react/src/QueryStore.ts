import {
  AbstractPowerSyncDatabase,
  IncrementalWatchMode,
  WatchCompatibleQuery,
  WatchedQuery,
  WatchedQueryListenerEvent
} from '@powersync/common';
import { AdditionalOptions } from './hooks/watched/watch-types';

export function generateQueryKey(
  sqlStatement: string,
  parameters: ReadonlyArray<unknown>,
  options: AdditionalOptions
): string {
  return `${sqlStatement} -- ${JSON.stringify(parameters)} -- ${JSON.stringify(options)}`;
}

export class QueryStore {
  cache = new Map<string, WatchedQuery<unknown>>();

  constructor(private db: AbstractPowerSyncDatabase) {}

  getQuery(key: string, query: WatchCompatibleQuery<unknown>, options: AdditionalOptions) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const watchedQuery = this.db
      .incrementalWatch({
        mode: IncrementalWatchMode.COMPARISON
      })
      .build({
        watch: {
          query,
          placeholderData: [],
          throttleMs: options.throttleMs
        },
        comparator: options.comparator
      });

    const disposer = watchedQuery.registerListener({
      closed: () => {
        this.cache.delete(key);
        disposer?.();
      }
    });

    watchedQuery.listenerMeta.registerListener({
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
          watchedQuery.close();
          this.cache.delete(key);
        }
      }
    });

    this.cache.set(key, watchedQuery);

    return watchedQuery;
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
