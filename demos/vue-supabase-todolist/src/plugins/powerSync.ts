import { AppSchema } from '@/library/powersync/AppSchema';
import { PowerSyncDatabase } from '@powersync/web';
import { createPowerSyncPlugin } from '@powersync/vue';

export const powerSync = new PowerSyncDatabase({
  database: { dbFilename: 'example-vue-todo.db' },
  schema: AppSchema
});

export const powerSyncPlugin = createPowerSyncPlugin({ database: powerSync });
