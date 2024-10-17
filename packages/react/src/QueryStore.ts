import { AbstractPowerSyncDatabase } from '@powersync/common';
import { Query, WatchedQuery } from './WatchedQuery';
import { AdditionalOptions } from './hooks/useQuery';

export function generateQueryKey(sqlStatement: string, parameters: any[], options: AdditionalOptions): string {
  return `${sqlStatement} -- ${JSON.stringify(parameters)} -- ${JSON.stringify(options)}`;
}

export class QueryStore {
  cache = new Map<string, WatchedQuery>();

  constructor(private db: AbstractPowerSyncDatabase) {}

  getQuery(key: string, query: Query<unknown>, options: AdditionalOptions) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const q = new WatchedQuery(this.db, query, options);
    const disposer = q.registerListener({
      disposed: () => {
        this.cache.delete(key);
        disposer?.();
      }
    });

    this.cache.set(key, q);

    return q;
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
