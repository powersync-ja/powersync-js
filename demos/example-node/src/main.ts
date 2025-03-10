import {
  AbstractPowerSyncDatabase,
  column,
  PowerSyncBackendConnector,
  PowerSyncDatabase,
  Schema,
  SyncStreamConnectionMethod,
  Table
} from '@powersync/node';
import Logger from 'js-logger';

const main = async () => {
  if (!('DEMO_ENDPOINT' in process.env) || !('DEMO_TOKEN' in process.env)) {
    console.warn('Set the DEMO_ENDPOINT and DEMO_TOKEN environment variables to point at a sync service with a dev token to run this example.');
    return;
  }

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

  await db.connect(new DemoConnector(), {connectionMethod: SyncStreamConnectionMethod.HTTP});
  await db.waitForFirstSync();
  console.log('First sync complete!');

  let hasFirstRow: ((value: any) => void) | null = null;
  const firstRow = new Promise((resolve) => (hasFirstRow = resolve));
  const watchLists = async () => {
    for await (const rows of db.watch('SELECT * FROM lists')) {
      if (hasFirstRow) {
        hasFirstRow(null);
        hasFirstRow = null;
      }
      console.log('Has todo items', rows.rows?._array);
    }
  };

  watchLists();
  await firstRow;

  //  await db.execute("INSERT INTO lists (id, created_at, name, owner_id) VALUEs (uuid(), 'test', 'test', 'test');");
};

class DemoConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    console.log('fetchCredentials called');

    return {
      endpoint: process.env.DEMO_ENDPOINT!,
      token: process.env.DEMO_TOKEN!,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    await new Promise((resolve) => setTimeout(resolve, 10_000));
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
