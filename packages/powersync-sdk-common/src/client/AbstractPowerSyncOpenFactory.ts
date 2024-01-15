import { DBAdapter } from '../db/DBAdapter';
import { Schema } from '../db/schema/Schema';
import { AbstractPowerSyncDatabase, PowerSyncDatabaseOptions } from './AbstractPowerSyncDatabase';

export interface PowerSyncOpenFactoryOptions extends Partial<PowerSyncDatabaseOptions> {
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
  constructor(protected options: PowerSyncOpenFactoryOptions) {}

  get schema() {
    return this.options.schema;
  }

  protected abstract openDB(): DBAdapter;

  generateOptions(): PowerSyncDatabaseOptions {
    return {
      database: this.openDB(),
      schema: this.schema,
      ...this.options
    };
  }

  abstract generateInstance(options: PowerSyncDatabaseOptions): AbstractPowerSyncDatabase;

  getInstance(): AbstractPowerSyncDatabase {
    const options = this.generateOptions();
    return this.generateInstance(options);
  }
}
