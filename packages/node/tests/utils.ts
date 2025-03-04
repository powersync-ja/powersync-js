import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "vitest";
import {
    column,
    PowerSyncDatabase,
    Schema,
    Table,
  } from '../lib';

  async function createTempDir() {
    const ostmpdir = os.tmpdir();
    const tmpdir = path.join(ostmpdir, "powersync-node-test-");
    return await fs.mkdtemp(tmpdir);
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

export const databaseTest = test.extend<{database: PowerSyncDatabase}>({
    database: async ({}, use) => {
        const directory = await createTempDir();
        const database = new PowerSyncDatabase({
            schema: AppSchema,
            database: {
                dbFilename: 'test.db',
                dbLocation: directory,
            },
        });
        await use(database);
        await fs.rm(directory, {recursive: true});
    },
});
