import Logger from 'js-logger';
import { DBAdapter } from '../db/DBAdapter.js';
import { Schema } from '../db/schema/Schema.js';
import { AbstractPowerSyncDatabase, PowerSyncDatabaseOptions } from './AbstractPowerSyncDatabase.js';
import { SQLOpenOptions } from './SQLOpenFactory.js';

export interface PowerSyncOpenFactoryOptions extends Partial<PowerSyncDatabaseOptions>, SQLOpenOptions {
  /** Schema used for the local database. */
  schema: Schema;
}

export abstract class AbstractPowerSyncDatabaseOpenFactory {
  constructor(protected options: PowerSyncOpenFactoryOptions) {
    options.logger = options.logger ?? Logger.get(`PowerSync ${this.options.dbFilename}`);
  }

  /**
   * Schema used for the local database.
   */
  get schema() {
    return this.options.schema;
  }

  protected abstract openDB(): DBAdapter;

  generateOptions(): PowerSyncDatabaseOptions {
    return {
      database: this.openDB(),
      ...this.options
    };
  }

  abstract generateInstance(options: PowerSyncDatabaseOptions): AbstractPowerSyncDatabase;

  getInstance(): AbstractPowerSyncDatabase {
    const options = this.generateOptions();
    return this.generateInstance(options);
  }
}
