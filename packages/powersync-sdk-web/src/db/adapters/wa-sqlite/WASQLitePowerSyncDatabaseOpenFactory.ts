import { AbstractPowerSyncDatabase, DBAdapter, PowerSyncDatabaseOptions } from '@journeyapps/powersync-sdk-common';
import { PowerSyncDatabase } from '../../../db/PowerSyncDatabase';
import { WASQLiteDBAdapter } from './WASQLiteDBAdapter';
import { AbstractWebPowerSyncDatabaseOpenFactory } from '../AbstractWebPowerSyncDatabaseOpenFactory';

export class WASQLitePowerSyncDatabaseOpenFactory extends AbstractWebPowerSyncDatabaseOpenFactory {
  protected openDB(): DBAdapter {
    return new WASQLiteDBAdapter({ ...this.options, flags: this.resolveDBFlags() });
  }

  generateInstance(options: PowerSyncDatabaseOptions): AbstractPowerSyncDatabase {
    return new PowerSyncDatabase(options);
  }
}
