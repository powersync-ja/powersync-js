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
      { trackMetadata: true }
    )
  });
  await database.updateSchema(schema);
  await database.execute('INSERT INTO lists (id, name, _metadata) VALUES (uuid(), ?, ?);', ['entry', 'so meta']);

  const batch = await database.getNextCrudTransaction();
  expect(batch?.crud[0].metadata).toBe('so meta');
  expect(JSON.stringify(batch?.crud[0])).toContain('"metadata":"so meta"');
});

databaseTest('include old values', async ({ database }) => {
  await database.init();
  const schema = new Schema({
    lists: new Table(
      {
        name: column.text
      },
      { trackPrevious: true }
    )
  });
  await database.updateSchema(schema);
  await database.execute('INSERT INTO lists (id, name) VALUES (?, ?);', [
    'a185b7e1-dffa-4a9a-888c-15c0f0cac4b3',
    'entry'
  ]);
  await database.execute('DELETE FROM ps_crud;');
  await database.execute('UPDATE lists SET name = ?', ['new name']);

  const batch = await database.getNextCrudTransaction();
  expect(batch?.crud[0].previousValues).toStrictEqual({ name: 'entry' });
  expect(JSON.stringify(batch?.crud[0])).toBe(
    '{"op_id":2,"op":"PATCH","type":"lists","id":"a185b7e1-dffa-4a9a-888c-15c0f0cac4b3","tx_id":2,"data":{"name":"new name"},"old":{"name":"entry"}}'
  );
});

databaseTest('include old values with column filter', async ({ database }) => {
  await database.init();
  const schema = new Schema({
    lists: new Table(
      {
        name: column.text,
        content: column.text
      },
      { trackPrevious: { columns: ['name'] } }
    )
  });
  await database.updateSchema(schema);
  await database.execute('INSERT INTO lists (id, name, content) VALUES (uuid(), ?, ?);', ['name', 'content']);
  await database.execute('DELETE FROM ps_crud;');
  await database.execute('UPDATE lists SET name = ?, content = ?', ['new name', 'new content']);

  const batch = await database.getNextCrudTransaction();
  expect(batch?.crud[0].previousValues).toStrictEqual({ name: 'name' });
});

databaseTest('include old values when changed', async ({ database }) => {
  await database.init();
  const schema = new Schema({
    lists: new Table(
      {
        name: column.text,
        content: column.text
      },
      { trackPrevious: { onlyWhenChanged: true } }
    )
  });
  await database.updateSchema(schema);
  await database.execute('INSERT INTO lists (id, name, content) VALUES (uuid(), ?, ?);', ['name', 'content']);
  await database.execute('DELETE FROM ps_crud;');
  await database.execute('UPDATE lists SET name = ?', ['new name']);

  const batch = await database.getNextCrudTransaction();
  expect(batch?.crud[0].previousValues).toStrictEqual({ name: 'name' });
});

databaseTest('ignore empty update', async ({ database }) => {
  await database.init();
  const schema = new Schema({
    lists: new Table(
      {
        name: column.text
      },
      { ignoreEmptyUpdates: true }
    )
  });
  await database.updateSchema(schema);
  await database.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?);', ['name']);
  await database.execute('DELETE FROM ps_crud;');
  await database.execute('UPDATE lists SET name = ?', ['name']);

  const batch = await database.getNextCrudTransaction();
  expect(batch).toBeNull();
});
