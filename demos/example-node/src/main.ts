import {
  AbstractPowerSyncDatabase,
  column,
  PowerSyncBackendConnector,
  PowerSyncDatabase,
  Schema,
  Table
} from '@powersync/node';
import Logger from 'js-logger';

const main = async () => {
  const db = new PowerSyncDatabase({
    schema: AppSchema,
    database: {
      dbFilename: 'test.db'
    },
    logger: Logger
  });
  console.log(await db.get('SELECT powersync_rs_version();'));
  db.registerListener({
    statusChanged: (status) => {
      console.log('Sync status', status);
    }
  });

  await db.connect(new DemoConnector());

  await db.waitForFirstSync();
  console.log(await db.getAll('SELECT * FROM lists;'));
};

class DemoConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    return {
      endpoint: '', // todo
      token: '' // todo
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    throw 'not implemented: DemoConnector.uploadData';
  }
}

export const LIST_TABLE = 'lists';
export const TODO_TABLE = 'todos';

const todos = new Table(
  {
    list_id: column.text,
    created_at: column.text,
    completed_at: column.text,
    description: column.text,
    created_by: column.text,
    completed_by: column.text,
    completed: column.integer,
    photo_id: column.text
  },
  { indexes: { list: ['list_id'] } }
);

const lists = new Table({
  created_at: column.text,
  name: column.text,
  owner_id: column.text
});

export const AppSchema = new Schema({
  lists,
  todos
});

export type Database = (typeof AppSchema)['types'];
export type TodoRecord = Database['todos'];
export type ListRecord = Database['lists'];

await main();
