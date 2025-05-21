import { AbstractPowerSyncDatabase, WatchedQuery } from '@powersync/common';
import { Query } from './WatchedQuery';
import { AdditionalOptions } from './hooks/useQuery';

export function generateQueryKey(sqlStatement: string, parameters: any[], options: AdditionalOptions): string {
  return `${sqlStatement} -- ${JSON.stringify(parameters)} -- ${JSON.stringify(options)}`;
}

export class QueryStore {
  cache = new Map<string, WatchedQuery<unknown[]>>();

  constructor(private db: AbstractPowerSyncDatabase) {}

  getQuery(key: string, query: Query<unknown>, options: AdditionalOptions) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const customExecutor = typeof query.rawQuery !== 'string' ? query.rawQuery : null;

    const watchedQuery = this.db.incrementalWatch({
      sql: query.sqlStatement,
      parameters: query.queryParameters,
      customExecutor: customExecutor
        ? {
            initialData: [],
            execute: () => customExecutor.execute()
          }
        : undefined,
      throttleMs: options.throttleMs
    });

    const disposer = watchedQuery.registerListener({
      closed: () => {
        this.cache.delete(key);
        disposer?.();
      }
    });

    watchedQuery.registerListener({
      subscriptionsChanged: (counts) => {
        // Dispose this query if there are no subscribers present
        if (counts.total == 0) {
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
