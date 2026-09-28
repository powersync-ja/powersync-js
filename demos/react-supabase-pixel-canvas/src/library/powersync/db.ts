import { PowerSyncDatabase, WASQLiteOpenFactory } from '@powersync/web';

import { AppSchema } from './AppSchema';
import { selectMultiTabs, selectVFS } from './vfs';

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: new WASQLiteOpenFactory({
    dbFilename: 'pixel-canvas.db',
    vfs: selectVFS(),
    flags: {
      enableMultiTabs: selectMultiTabs()
    }
  })
});
