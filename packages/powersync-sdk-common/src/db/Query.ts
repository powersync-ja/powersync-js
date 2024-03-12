import type { AbstractPowerSyncDatabase, SQLWatchOptions } from '../client/AbstractPowerSyncDatabase';
import { QueryResult } from './DBAdapter';

export class Query<T> {
  db: AbstractPowerSyncDatabase;
  sql: string;
  parameters: any[];

  constructor(db: AbstractPowerSyncDatabase, sql: string, parameters?: any[]) {
    this.db = db;
    this.sql = sql;
    this.parameters = parameters ?? [];
  }

  execute(): Promise<QueryResult> {
    return this.db.execute(this.sql, this.parameters);
  }

  getAll(): Promise<T[]> {
    return this.db.getAll<T>(this.sql, this.parameters);
  }

  get(): Promise<T> {
    return this.db.get<T>(this.sql, this.parameters);
  }

  getOptional(): Promise<T | null> {
    return this.db.getOptional<T>(this.sql, this.parameters);
  }

  async *watch(options?: SQLWatchOptions): AsyncIterable<T[]> {
    for await (let r of this.db.watch(this.sql, this.parameters, options)) {
      yield r.rows!._array;
    }
  }

  async preload(): Promise<QueryWithResult<T>> {
    const r = await this.getAll();
    return {
      initialResults: r,
      query: this
    };
  }
}

export interface QueryWithResult<T> {
  initialResults: T[];
  query: Query<T>;
}
