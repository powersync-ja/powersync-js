import { column, Schema, Table } from '@powersync/common';
import { PowerSyncTauriDatabase } from '@powersync/tauri-plugin';
import { invoke } from '@tauri-apps/api/core';

const todos = new Table(
  {
    list_id: column.text,
    created_at: column.text,
    description: column.text,
    completed: column.integer
  },
  { indexes: { list: ['list_id'] } }
);

const lists = new Table({
  created_at: column.text,
  name: column.text
});

const schema = new Schema({
  todos,
  lists
});

async function connect(db: PowerSyncTauriDatabase) {
  await db.init();
  const handle = db.rustHandle;
  await invoke<void>('connect', { handle });
}

export function createDatabase() {
  const db = new PowerSyncTauriDatabase({
    schema,
    database: {
      dbFilename: 'memory'
    }
  });
  connect(db);
  return db;
}
