import { QueryResult, LockContext, RawQueryResult } from '@powersync/common';
import { releaseProxy, Remote } from 'comlink';
import { Worker } from 'node:worker_threads';
import { AsyncDatabase, AsyncDatabaseOpener } from './AsyncDatabase.js';
import { ConnectionClosedError } from '@powersync/shared-internals';

/**
 * A PowerSync database connection implemented with RPC calls to a background worker.
 */
export class RemoteConnection extends LockContext {
  private readonly worker: Worker;
  private readonly comlink: Remote<AsyncDatabaseOpener>;
  private readonly database: Remote<AsyncDatabase>;

  private readonly notifyWorkerClosed = new AbortController();

  constructor(
    worker: Worker,
    comlink: Remote<AsyncDatabaseOpener>,
    database: Remote<AsyncDatabase>,
    private readonly readonly: boolean
  ) {
    super();
    this.worker = worker;
    this.comlink = comlink;
    this.database = database;

    this.worker.once('exit', (_) => {
      this.notifyWorkerClosed.abort();
    });
  }

  public get connectionType() {
    return this.readonly ? 'readOnly' : 'writer';
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
        reject(new ConnectionClosedError('Called operation on closed remote'));
      }

      function handleAbort() {
        reject(new ConnectionClosedError('Remote peer closed with request in flight'));
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

  executeBatch(query: string, params: any[][] = []): Promise<QueryResult<never>> {
    return this.withRemote(async () => {
      return await this.database.executeBatch(query, params ?? []);
    });
  }

  executeRaw(query: string, params?: any[] | undefined): Promise<RawQueryResult> {
    return this.withRemote(async () => {
      return await this.database.executeRaw(query, params ?? []);
    });
  }

  async refreshSchema() {
    await this.executeRaw("pragma table_info('sqlite_master')");
  }

  async close() {
    await this.database.close();
    this.database[releaseProxy]();
    this.comlink[releaseProxy]();
    await this.worker.terminate();
  }
}
