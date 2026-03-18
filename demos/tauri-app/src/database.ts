import { column, Schema, Table } from '@powersync/common';
import { PowerSyncTauriDatabase } from '@powersync/tauri-plugin';

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

export function createDatabase() {
  return new PowerSyncTauriDatabase({
    schema,
    database: {
      dbFilename: 'memory'
    }
  });
}
