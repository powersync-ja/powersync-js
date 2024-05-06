import { type AbstractPowerSyncDatabase } from '@powersync/common';
import { Driver } from 'kysely';
import { PowerSyncConnection } from './sqlite-connection';

export interface PowerSyncDialectConfig {
  db: AbstractPowerSyncDatabase;
}

export class PowerSyncDriver implements Driver {
  readonly #db: AbstractPowerSyncDatabase;

  constructor(config: PowerSyncDialectConfig) {
    this.#db = config.db;
  }

  async init(): Promise<void> {}

  async acquireConnection(): Promise<PowerSyncConnection> {
    return new PowerSyncConnection(this.#db);
  }

  async beginTransaction(connection: PowerSyncConnection): Promise<void> {
    await connection.beginTransaction();
  }

  async commitTransaction(connection: PowerSyncConnection): Promise<void> {
    await connection.commitTransaction();
  }

  async rollbackTransaction(connection: PowerSyncConnection): Promise<void> {
    await connection.rollbackTransaction();
  }

  async releaseConnection(connection: PowerSyncConnection): Promise<void> {
    await connection.releaseConnection();
  }

  /**
    This will do nothing. Instead use PowerSync `disconnectAndClear` function.
   */
  async destroy(): Promise<void> {}
}
