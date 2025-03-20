import { Worker } from 'node:worker_threads';
import { LockContext, QueryResult } from '@powersync/common';
import { releaseProxy, Remote } from 'comlink';
import { AsyncDatabase, AsyncDatabaseOpener, ProxiedQueryResult } from './AsyncDatabase.js';

/**
 * A PowerSync database connection implemented with RPC calls to a background worker.
 */
export class RemoteConnection implements LockContext {
  isBusy = false;

  private readonly worker: Worker;
  private readonly comlink: Remote<AsyncDatabaseOpener>;
  readonly database: Remote<AsyncDatabase>;

  constructor(worker: Worker, comlink: Remote<AsyncDatabaseOpener>, database: Remote<AsyncDatabase>) {
    this.worker = worker;
    this.comlink = comlink;
    this.database = database;
  }

  async executeBatch(query: string, params: any[][] = []): Promise<QueryResult> {
    const result = await this.database.executeBatch(query, params ?? []);
    return RemoteConnection.wrapQueryResult(result);
  }

  async execute(query: string, params?: any[] | undefined): Promise<QueryResult> {
    const result = await this.database.execute(query, params ?? []);
    return RemoteConnection.wrapQueryResult(result);
  }

  async executeRaw(query: string, params?: any[] | undefined): Promise<any[][]> {
    return await this.database.executeRaw(query, params ?? []);
  }

  async getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
    const res = await this.execute(sql, parameters);
    return res.rows?._array ?? [];
  }

  async getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
    const res = await this.execute(sql, parameters);
    return res.rows?.item(0) ?? null;
  }

  async get<T>(sql: string, parameters?: any[]): Promise<T> {
    const res = await this.execute(sql, parameters);
    const first = res.rows?.item(0);
    if (!first) {
      throw new Error('Result set is empty');
    }
    return first;
  }

  async refreshSchema() {
    await this.execute("pragma table_info('sqlite_master')");
  }

  async close() {
    await this.database.close();
    this.database[releaseProxy]();
    this.comlink[releaseProxy]();
    await this.worker.terminate();
  }

  static wrapQueryResult(result: ProxiedQueryResult): QueryResult {
    let rows: QueryResult['rows'] | undefined = undefined;
    if (result.rows) {
      rows = {
        ...result.rows,
        item: (idx) => result.rows?._array[idx]
      } satisfies QueryResult['rows'];
    }

    return {
      ...result,
      rows
    };
  }
}
