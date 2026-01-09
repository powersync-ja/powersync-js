import { ILogger } from '@powersync/common';
import {
  AsyncDatabaseConnection,
  OnTableChangeCallback,
  ProxiedQueryResult
} from '../../db/adapters/AsyncDatabaseConnection.js';
import { ResolvedWebSQLOpenOptions } from '../../db/adapters/web-sql-flags.js';

/**
 * Keeps track of open DB connections and the clients which
 * are using it.
 */
export type SharedDBWorkerConnection = {
  clientIds: Set<number>;
  db: AsyncDatabaseConnection;
};

export type SharedWASQLiteConnectionOptions = {
  dbMap: Map<string, SharedDBWorkerConnection>;
  dbFilename: string;
  clientId: number;
  logger: ILogger;
};

export class SharedWASQLiteConnection implements AsyncDatabaseConnection {
  protected isClosing: boolean;
  // Keeps track if this current hold if the shared connection has a hold
  protected activeHoldId: string | null;

  constructor(protected options: SharedWASQLiteConnectionOptions) {
    // Add this client ID to the set of known clients
    this.clientIds.add(options.clientId);
    this.isClosing = false;
    this.activeHoldId = null;
  }

  protected get logger() {
    return this.options.logger;
  }

  protected get dbEntry() {
    return this.options.dbMap.get(this.options.dbFilename)!;
  }

  protected get connection() {
    return this.dbEntry.db;
  }

  protected get clientIds() {
    return this.dbEntry.clientIds;
  }

  async init(): Promise<void> {
    // No-op since the connection is already initialized when it was created
  }

  async markHold(): Promise<string> {
    this.activeHoldId = await this.connection.markHold();
    return this.activeHoldId;
  }

  async releaseHold(id: string): Promise<void> {
    try {
      await this.connection.releaseHold(id);
    } finally {
      this.activeHoldId = null;
    }
  }

  async isAutoCommit(): Promise<boolean> {
    return this.connection.isAutoCommit();
  }

  /**
   * Handles closing of a shared connection.
   * The connection is only closed if there are no active clients using it.
   */
  async close(): Promise<void> {
    // This prevents further statements on this connection from being executed
    this.isClosing = true;
    const { clientIds, logger } = this;
    const { clientId, dbFilename, dbMap } = this.options;
    logger.debug(`Close requested from client ${clientId} of ${[...clientIds]}`);
    clientIds.delete(clientId);

    if (this.activeHoldId) {
      // We can't cleanup here since we're not in a lock context.
      // The cleanup will occur once a new hold is acquired.
      this.logger.info(
        `Hold ${this.activeHoldId} was still active when the connection was closed. Cleanup will occur once a new hold is acquired.`
      );
    }

    if (clientIds.size == 0) {
      logger.debug(`Closing connection to ${this.options}.`);
      const connection = this.connection;
      dbMap.delete(dbFilename);
      await connection.close();
      return;
    }
    logger.debug(`Connection to ${dbFilename} not closed yet due to active clients.`);
    return;
  }

  protected async withClosing<T>(action: () => Promise<T>) {
    if (this.isClosing) {
      throw new Error('Connection is closing');
    }
    return action();
  }

  async execute(sql: string, params?: any[]): Promise<ProxiedQueryResult> {
    return this.withClosing(() => this.connection.execute(sql, params));
  }

  async executeRaw(sql: string, params?: any[]): Promise<any[][]> {
    return this.withClosing(() => this.connection.executeRaw(sql, params));
  }

  executeBatch(sql: string, params?: any[] | undefined): Promise<ProxiedQueryResult> {
    return this.withClosing(() => this.connection.executeBatch(sql, params));
  }

  registerOnTableChange(callback: OnTableChangeCallback): Promise<() => void> {
    return this.connection.registerOnTableChange(callback);
  }

  getConfig(): Promise<ResolvedWebSQLOpenOptions> {
    return this.connection.getConfig();
  }
}
