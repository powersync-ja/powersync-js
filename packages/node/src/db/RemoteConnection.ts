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
  private readonly database: Remote<AsyncDatabase>;

  private readonly notifyWorkerClosed = new AbortController();

  constructor(worker: Worker, comlink: Remote<AsyncDatabaseOpener>, database: Remote<AsyncDatabase>) {
    this.worker = worker;
    this.comlink = comlink;
    this.database = database;

    this.worker.once('exit', (_) => {
      this.notifyWorkerClosed.abort();
    });
  }

  /**
   * Runs the inner function, but appends the stack trace where this function was called. This is useful for workers
   * because stack traces from worker errors are otherwise unrelated to the application issue that has caused them.
   */
  private withRemote<T>(inner: () => Promise<T>): Promise<T> {
    const trace = {};
    Error.captureStackTrace(trace);
    const controller = this.notifyWorkerClosed;

    return new Promise((resolve, reject) => {
      if (controller.signal.aborted) {
        reject(new Error('Called operation on closed remote'));
      }

      function handleAbort() {
        reject(new Error('Remote peer closed with request in flight'));
      }

      function completePromise(action: () => void) {
        controller!.signal.removeEventListener('abort', handleAbort);
        action();
      }

      controller.signal.addEventListener('abort', handleAbort);

      inner()
        .then((data) => completePromise(() => resolve(data)))
        .catch((e) => {
          if (e instanceof Error && e.stack) {
            e.stack += (trace as any).stack;
          }

          return completePromise(() => reject(e));
        });
    });
  }

  executeBatch(query: string, params: any[][] = []): Promise<QueryResult> {
    return this.withRemote(async () => {
      const result = await this.database.executeBatch(query, params ?? []);
      return RemoteConnection.wrapQueryResult(result);
    });
  }

  execute(query: string, params?: any[] | undefined): Promise<QueryResult> {
    return this.withRemote(async () => {
      const result = await this.database.execute(query, params ?? []);
      return RemoteConnection.wrapQueryResult(result);
    });
  }

  executeRaw(query: string, params?: any[] | undefined): Promise<any[][]> {
    return this.withRemote(async () => {
      return await this.database.executeRaw(query, params ?? []);
    });
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
