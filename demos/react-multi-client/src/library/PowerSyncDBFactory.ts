import { TimedPowerSyncDatabase } from '@/library/TimedPowerSyncDatabase';
import { PowerSyncDatabaseOptions, WASQLitePowerSyncDatabaseOpenFactory } from '@powersync/web';

export class TimedPowerSyncDBFactory extends WASQLitePowerSyncDatabaseOpenFactory {
  generateInstance(options: PowerSyncDatabaseOptions) {
    return new TimedPowerSyncDatabase(options);
  }

  getInstance(): TimedPowerSyncDatabase {
    return super.getInstance() as TimedPowerSyncDatabase;
  }
}
