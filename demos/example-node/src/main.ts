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

  let hasFirstRow: ((value: any) => void) | null = null;
  const firstRow = new Promise((resolve) => hasFirstRow = resolve);
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
    return {
      endpoint: 'https://678775966cf706da85f4e447.powersync.journeyapps.com', // todo
      token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6InBvd2Vyc3luYy1kZXYtMzIyM2Q0ZTMifQ.eyJzdWIiOiI5MGQ5MzBhZi1iYmVkLTQ0NDgtOWM0NS1kYWQyZGYzMDAwNWYiLCJpYXQiOjE3NDEwMTU4NjUsImlzcyI6Imh0dHBzOi8vcG93ZXJzeW5jLWFwaS5qb3VybmV5YXBwcy5jb20iLCJhdWQiOiJodHRwczovLzY3ODc3NTk2NmNmNzA2ZGE4NWY0ZTQ0Ny5wb3dlcnN5bmMuam91cm5leWFwcHMuY29tIiwiZXhwIjoxNzQxMDU5MDY1fQ.aQqLOulvaOMKFtOUfbYuywLRjxmhs1J9hpdlkoSjw2m1_OTmnoVJkMRFKvO45k2I_ZD1GLg2sb6HoV2KNQHJPp2yMeL5eBENXt1HEy-WKU5ObrbwoQT0knkHnwZRmbGNwPYz3R21GibKDdD8chILVtNkSXoy3LjAUmywdzzhMBmmJwiIxP5Ew_K4XAxBU2pDyjX3FNvISHdB60IPgGBQUz3Ke_t-4ZD-k-EUHVLDufhxsDRSwhIKG26PPUqJdZ4YPlqwtjjZrVHy_B4XQBtRsAjqhf61ZLFEx6xeHcze-xZRNVsTw3qTmAFC4Vf9Ezka5jhMppM_HAtPn_wyzWUauA' // todo
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
