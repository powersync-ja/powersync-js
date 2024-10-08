import { AbstractPowerSyncDatabase, CompilableQuery, SQLWatchOptions } from '@powersync/common';
import { Query, WatchedQuery } from './WatchedQuery';

export class QueryStore {
  cache = new Map<string, WatchedQuery>();

  constructor(private db: AbstractPowerSyncDatabase) {}

  getQuery(key: string, query: Query<unknown>, options: SQLWatchOptions) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const disposer = () => {
      this.cache.delete(key);
    };
    const q = new WatchedQuery(this.db, query, options, disposer);
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
