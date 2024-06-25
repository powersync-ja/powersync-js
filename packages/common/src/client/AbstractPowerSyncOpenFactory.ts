import Logger from 'js-logger';
import { DBAdapter } from '../db/DBAdapter';
import { Schema } from '../db/schema/Schema';
import { AbstractPowerSyncDatabase, PowerSyncDatabaseOptions } from './AbstractPowerSyncDatabase';
import { SQLOpenOptions } from './SQLOpenFactory';

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
