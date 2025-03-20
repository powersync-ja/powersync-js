import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'vitest';
import { column, PowerSyncDatabase, Schema, Table } from '../lib';

export async function createTempDir() {
  const ostmpdir = os.tmpdir();
  const tmpdir = path.join(ostmpdir, 'powersync-node-test-');
  return await fs.mkdtemp(tmpdir);
}

export const LIST_TABLE = 'lists';
export const TODO_TABLE = 'todos';

const lists = new Table({
  name: column.text
});

const todos = new Table({
  content: column.text,
  list_id: column.text
});

export const AppSchema = new Schema({
  lists,
  todos
});

export type Database = (typeof AppSchema)['types'];

export const databaseTest = test.extend<{ database: PowerSyncDatabase }>({
  database: async ({}, use) => {
    const directory = await createTempDir();
    const database = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'test.db',
        dbLocation: directory
      }
    });
    await use(database);
    await fs.rm(directory, { recursive: true });
  }
});
