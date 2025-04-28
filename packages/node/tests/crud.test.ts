import { expect } from 'vitest';
import { column, Schema, Table } from '@powersync/common';
import { databaseTest } from './utils';

databaseTest('include metadata', async ({ database }) => {
  await database.init();
  const schema = new Schema({
    lists: new Table(
      {
        name: column.text
      },
      { includeMetadata: true }
    )
  });
  await database.updateSchema(schema);
  await database.execute('INSERT INTO lists (id, name, _metadata) VALUES (uuid(), ?, ?);', ['entry', 'so meta']);
 
  const batch = await database.getNextCrudTransaction();
  expect(batch?.crud[0].metadata).toBe('so meta');
});

databaseTest('include old values', async ({ database }) => {
  await database.init();
  const schema = new Schema({
    lists: new Table(
      {
        name: column.text
      },
      { includeOld: true }
    )
  });
  await database.updateSchema(schema);
  await database.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?);', ['entry']);
  await database.execute('DELETE FROM ps_crud;');
  await database.execute('UPDATE lists SET name = ?', ['new name']);
 
  const batch = await database.getNextCrudTransaction();
  expect(batch?.crud[0].oldData).toStrictEqual({name: 'entry'});
});

databaseTest('include old values when changed', async ({ database }) => {
  await database.init();
  const schema = new Schema({
    lists: new Table(
      {
        name: column.text,
        content: column.text
      },
      { includeOld: 'when-changed' }
    )
  });
  await database.updateSchema(schema);
  await database.execute('INSERT INTO lists (id, name, content) VALUES (uuid(), ?, ?);', ['name', 'content']);
  await database.execute('DELETE FROM ps_crud;');
  await database.execute('UPDATE lists SET name = ?', ['new name']);
 
  const batch = await database.getNextCrudTransaction();
  expect(batch?.crud[0].oldData).toStrictEqual({name: 'name'});
});

databaseTest('ignore empty update', async ({ database }) => {
  await database.init();
  const schema = new Schema({
    lists: new Table(
      {
        name: column.text
      },
      { ignoreEmptyUpdate: true }
    )
  });
  await database.updateSchema(schema);
  await database.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?);', ['name']);
  await database.execute('DELETE FROM ps_crud;');
  await database.execute('UPDATE lists SET name = ?', ['name']);
 
  const batch = await database.getNextCrudTransaction();
  expect(batch).toBeNull();
});
