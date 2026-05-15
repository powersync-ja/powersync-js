import { AppSchema } from '@/library/powersync/AppSchema';
import { createPowerSyncLogger, LogLevels, PowerSyncDatabase } from '@powersync/web';
import { createPowerSyncPlugin } from '@powersync/vue';

export const powerSync = new PowerSyncDatabase({
  database: { dbFilename: 'example-vue-todo.db' },
  schema: AppSchema,
  logger: createPowerSyncLogger({ minLevel: LogLevels.debug })
});

export const powerSyncPlugin = createPowerSyncPlugin({ database: powerSync });
