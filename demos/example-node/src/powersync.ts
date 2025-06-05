import { AbstractPowerSyncDatabase, column, PowerSyncBackendConnector, Schema, Table } from '@powersync/node';

export class DemoConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    if (process.env.POWERSYNC_TOKEN) {
      return {
        endpoint: process.env.SYNC_SERVICE!,
        token: process.env.POWERSYNC_TOKEN
      };
    }

    const response = await fetch(`${process.env.BACKEND}/api/auth/token`);
    if (response.status != 200) {
      throw 'Could not fetch token';
    }

    const { token } = await response.json();

    return {
      endpoint: process.env.SYNC_SERVICE!,
      token: token
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    const batch = await database.getCrudBatch();
    if (batch == null) {
      return;
    }

    const entries: any[] = [];
    for (const op of batch.crud) {
      entries.push({
        table: op.table,
        op: op.op,
        id: op.id,
        data: op.opData
      });
    }

    const response = await fetch(`${process.env.BACKEND}/api/data/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: entries })
    });
    if (response.status !== 200) {
      throw new Error(`Server returned HTTP ${response.status}: ${await response.text()}`);
    }

    await batch?.complete();
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
