import Logger from 'js-logger';
import { DBAdapter } from '../db/DBAdapter';
import { Schema } from '../db/schema/Schema';
import { AbstractPowerSyncDatabase, PowerSyncDatabaseOptions } from './AbstractPowerSyncDatabase';

export interface PowerSyncOpenFactoryOptions extends Partial<PowerSyncDatabaseOptions> {
  /** Schema used for the local database. */
  schema: Schema;
  /**
   * Filename for the database.
   */
  dbFilename: string;
  /**
   * Directory where the database file is located.
   */
  dbLocation?: string;
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
