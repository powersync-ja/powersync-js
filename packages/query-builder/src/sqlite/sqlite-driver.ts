import { type AbstractPowerSyncDatabase } from '@journeyapps/powersync-sdk-web';
import { DatabaseConnection, Driver } from 'kysely';
import { PowerSyncConnection } from './sqlite-connection';

export interface PowerSyncDialectConfig {
  db: AbstractPowerSyncDatabase;
}

export class PowerSyncDriver implements Driver {
  #db?: AbstractPowerSyncDatabase;

  constructor(config: PowerSyncDialectConfig) {
    this.#db = config.db;
  }

  async init(): Promise<void> {}

  async acquireConnection(): Promise<DatabaseConnection> {
    if (!this.#db) {
      throw new Error('PowerSync database has not been initialized');
    }

    // Always create a new connection instance
    return new PowerSyncConnection(this.#db);
  }

  async beginTransaction(connection: DatabaseConnection): Promise<void> {
    await (connection as PowerSyncConnection).beginTransaction();
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    await (connection as PowerSyncConnection).commitTransaction();
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    await (connection as PowerSyncConnection).rollbackTransaction();
  }

  async releaseConnection(connection: DatabaseConnection): Promise<void> {
    await (connection as PowerSyncConnection).releaseConnection();
  }

  async destroy(): Promise<void> {
    this.#db?.disconnectAndClear();
  }
}
