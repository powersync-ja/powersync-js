import { expect, test } from 'vitest';
import { PreparedStatementCache } from '../../../src/db/adapters/wa-sqlite/StatementCache.js';
import { generateTestDb } from '../../utils/testDb.js';
import { Schema } from '@powersync/common';

test('statement cache', () => {
  const cache = new PreparedStatementCache(10);
  for (let i = 0; i < 10; i++) {
    cache.addStatement(`SELECT ${i}`, i);
  }

  for (let i = 0; i < 10; i++) {
    expect(cache.lookup(`SELECT ${i}`)).toStrictEqual(i);
  }

  expect(cache.addStatement('SELECT 10', 10)).toStrictEqual(0);
  expect(cache.lookup('SELECT 0')).toBeNull();
  expect(cache.lookup('SELECT 1')).not.toBeNull();
});

test('lookup promotes entry to most-recently-used', () => {
  const cache = new PreparedStatementCache(3);
  cache.addStatement('SELECT 0', 0);
  cache.addStatement('SELECT 1', 1);
  cache.addStatement('SELECT 2', 2);

  // Access SELECT 0 so it becomes the most-recently-used entry.
  expect(cache.lookup('SELECT 0')).toStrictEqual(0);

  // Adding a fourth entry must evict SELECT 1 (oldest).
  expect(cache.addStatement('SELECT 3', 3)).toStrictEqual(1);
  expect(cache.lookup('SELECT 0')).not.toBeNull();
  expect(cache.lookup('SELECT 1')).toBeNull();
});

test('does not cache explain statements', async () => {
  const db = generateTestDb({
    schema: new Schema({}),
    database: {
      dbFilename: `${crypto.randomUUID()}.db`,
      preparedStatementsCache: 16
    }
  });

  await db.execute('create table test(id integer primary key, description text)');
  await db.execute('create index i1 on test(description)');
  const { detail: firstPlan } = await db.get<{ detail: string }>(
    'explain query plan select * from test where description = ?'
  );
  expect(firstPlan).toContain('USING COVERING INDEX i1');

  await db.execute('drop index i1');
  const { detail: secondPlan } = await db.get<{ detail: string }>(
    'explain query plan select * from test where description = ?'
  );
  expect(secondPlan).not.toContain('USING COVERING INDEX i1');
});
