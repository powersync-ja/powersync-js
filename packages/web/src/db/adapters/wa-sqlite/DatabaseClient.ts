import { QueryResult, LockContext, DBLockOptions, Transaction, DBAdapterListener } from '@powersync/common';
import { SharedConnectionWorker, WebDBAdapter, WebDBAdapterConfiguration } from '../WebDBAdapter.js';
import { ClientConnectionView } from './DatabaseServer.js';

export abstract class DatabaseClient implements WebDBAdapter {
  #resolvedConnection: ClientConnectionView | Promise<ClientConnectionView> | undefined;

  constructor() {}

  protected async resolveConnection(): Promise<ClientConnectionView> {
    const pending = this.#resolvedConnection;

    if (pending == null) {
      return (this.#resolvedConnection = this.openConnection().then((conn) => {
        this.#resolvedConnection = conn;
        return conn;
      }));
    } else if ('then' in pending) {
      return await pending;
    } else {
      return pending;
    }
  }

  protected abstract openConnection(): Promise<ClientConnectionView>;

  async close() {
    const connection = await this.resolveConnection();
    await connection.close();
  }

  shareConnection(): Promise<SharedConnectionWorker> {
    throw new Error('Method not implemented.');
  }

  getConfiguration(): WebDBAdapterConfiguration {
    throw new Error('Method not implemented.');
  }

  execute: (query: string, params?: any[]) => Promise<QueryResult>;

  executeRaw: (query: string, params?: any[]) => Promise<any[][]>;

  executeBatch: (query: string, params?: any[][]) => Promise<QueryResult>;

  name: string;

  readLock: <T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions) => Promise<T>;

  readTransaction: <T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions) => Promise<T>;

  writeLock: <T>(fn: (tx: LockContext) => Promise<T>, options?: DBLockOptions) => Promise<T>;

  writeTransaction: <T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions) => Promise<T>;

  refreshSchema: () => Promise<void>;

  registerListener(listener: Partial<DBAdapterListener>): () => void {
    throw new Error('Method not implemented.');
  }

  getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
    throw new Error('Method not implemented.');
  }

  getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
    throw new Error('Method not implemented.');
  }

  get<T>(sql: string, parameters?: any[]): Promise<T> {
    throw new Error('Method not implemented.');
  }
}
