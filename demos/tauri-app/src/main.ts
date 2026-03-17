import { Schema } from '@powersync/common';
import { PowerSyncTauriDatabase } from '@powersync/tauri-plugin';

const schema = new Schema([]);

(globalThis as any).setupDatabase = async () => {
  const db = new PowerSyncTauriDatabase({
    schema,
    database: {
      dbFilename: 'memory'
    }
  });
  await db.init();
  (globalThis as any).db = db;
};
