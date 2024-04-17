import { AppSchema } from '@/library/powersync/AppSchema';
import { WASQLitePowerSyncDatabaseOpenFactory } from '@journeyapps/powersync-sdk-web';
import { createPowerSyncPlugin } from '@powersync/vue';

export const powerSync = new WASQLitePowerSyncDatabaseOpenFactory({
  dbFilename: 'example-vue-todo.db',
  schema: AppSchema
}).getInstance();

export const powerSyncPlugin = createPowerSyncPlugin({ database: powerSync });
