import { AbstractPowerSyncDatabase, LockContext, QueryResult } from '@powersync/common';

/**
 * Like LockContext, but only includes the specific methods needed for Drizzle.
 *
 * We extend it by adding getAllRaw, to support read-only queries with executeRaw.
 */
export interface QueryContext {
  execute(query: string, params?: any[] | undefined): Promise<QueryResult>;
  executeRaw(query: string, params?: any[] | undefined): Promise<any[][]>;

  get<T>(sql: string, parameters?: any[]): Promise<T>;
  getAll<T>(sql: string, parameters?: any[]): Promise<T[]>;
  /**
   * Like executeRaw, but for read-only queries.
   */
  getAllRaw(query: string, params?: any[] | undefined): Promise<any[][]>;
}

export class DatabaseQueryContext implements QueryContext {
  constructor(private db: AbstractPowerSyncDatabase) {}
  execute(query: string, params?: any[] | undefined): Promise<QueryResult> {
    return this.db.execute(query, params);
  }
  executeRaw(query: string, params?: any[] | undefined) {
    return this.db.executeRaw(query, params);
  }
  get<T>(sql: string, parameters?: any[]) {
    return this.db.get<T>(sql, parameters);
  }
  getAll<T>(sql: string, parameters?: any[]) {
    return this.db.getAll<T>(sql, parameters);
  }
  getAllRaw(query: string, params?: any[] | undefined) {
    return this.db.readLock(async (ctx) => {
      return ctx.executeRaw(query, params);
    });
  }
}

export class LockQueryContext implements QueryContext {
  constructor(private ctx: LockContext) {}
  execute(query: string, params?: any[] | undefined): Promise<QueryResult> {
    return this.ctx.execute(query, params);
  }
  executeRaw(query: string, params?: any[] | undefined) {
    return this.ctx.executeRaw(query, params);
  }
  get<T>(sql: string, parameters?: any[]) {
    return this.ctx.get<T>(sql, parameters);
  }
  getAll<T>(sql: string, parameters?: any[]) {
    return this.ctx.getAll<T>(sql, parameters);
  }
  getAllRaw(query: string, params?: any[] | undefined) {
    return this.ctx.executeRaw(query, params);
  }
}
