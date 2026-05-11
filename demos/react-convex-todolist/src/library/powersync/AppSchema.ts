import { column, PowerSyncDatabase, Schema, SyncStream, Table } from '@powersync/web';
// OR: import { column, Schema, Table, PowerSyncDatabase, SyncStream } from '@powersync/react-native';

const lists = new Table(
  {
    // id column (text) is automatically included
    _creationTime: column.real,
    _id: column.text,
    archived: column.integer,
    created_at: column.text,
    name: column.text,
    notes: column.text,
    owner_id: column.text,
    priority: column.real,
    tags: column.text,
    uuid: column.text
  },
  { indexes: {} }
);

const todos = new Table(
  {
    // id column (text) is automatically included
    _creationTime: column.real,
    _id: column.text,
    completed: column.real,
    completed_at: column.text,
    created_at: column.text,
    description: column.text,
    list_id: column.text,
    list_uuid: column.text,
    uuid: column.text
  },
  { indexes: {} }
);

export const AppSchema = new Schema({
  lists,
  todos
});

export type Database = (typeof AppSchema)['types'];

export function typedStreams(db: PowerSyncDatabase) {
  return {
    archivedUserData(): SyncStream {
      return db.syncStream('archived_user_data', {});
    }
  };
}
