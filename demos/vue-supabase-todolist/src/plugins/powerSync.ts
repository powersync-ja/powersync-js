import { AppSchema } from '@/library/powersync/AppSchema';
import { WASQLitePowerSyncDatabaseOpenFactory } from '@journeyapps/powersync-sdk-web';
import { createPowerSync } from '@journeyapps/powersync-vue';

export const powerSync = new WASQLitePowerSyncDatabaseOpenFactory({
  dbFilename: 'example.db',
  schema: AppSchema
}).getInstance();

export const powerSyncPlugin = createPowerSync({ database: powerSync });
