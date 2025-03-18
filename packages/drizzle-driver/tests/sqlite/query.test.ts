import { AbstractPowerSyncDatabase } from '@powersync/web';
import { Query } from 'drizzle-orm/sql/sql';
import { PowerSyncSQLiteDatabase } from '../../src/sqlite/PowerSyncSQLiteDatabase';
import { PowerSyncSQLitePreparedQuery } from '../../src/sqlite/PowerSyncSQLitePreparedQuery';
import { DrizzleSchema, drizzleUsers, getDrizzleDb, getPowerSyncDb } from '../setup/db';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('PowerSyncSQLitePreparedQuery', () => {
  let powerSyncDb: AbstractPowerSyncDatabase;
  let db: PowerSyncSQLiteDatabase<typeof DrizzleSchema>;
  const loggerMock = { logQuery: () => {} };

  beforeEach(async () => {
    powerSyncDb = getPowerSyncDb();
    db = getDrizzleDb(powerSyncDb);

    await db.insert(drizzleUsers).values({ id: '1', name: 'Alice' });
    await db.insert(drizzleUsers).values({ id: '2', name: 'Bob' });
  });

  afterEach(async () => {
    await powerSyncDb.disconnectAndClear();
  });

  it('should execute a query in run()', async () => {
    const query: Query = { sql: `SELECT * FROM users WHERE id = ?`, params: [1] };
    const preparedQuery = new PowerSyncSQLitePreparedQuery(powerSyncDb, query, loggerMock, undefined, 'run', false);

    const result = await preparedQuery.run();
    expect(result.rows?._array).toEqual([{ id: '1', name: 'Alice' }]);
  });

  it('should retrieve all rows in all()', async () => {
    const query: Query = { sql: `SELECT * FROM users`, params: [] } as Query;
    const preparedQuery = new PowerSyncSQLitePreparedQuery(powerSyncDb, query, loggerMock, undefined, 'all', false);

    const rows = await preparedQuery.all();
    expect(rows).toEqual([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' }
    ]);
  });

  it('should retrieve a single row in get()', async () => {
    const query: Query = { sql: `SELECT * FROM users WHERE id = ?`, params: [1] };

    const preparedQuery = new PowerSyncSQLitePreparedQuery(powerSyncDb, query, loggerMock, undefined, 'get', false);

    const row = await preparedQuery.get();
    expect(row).toEqual({ id: '1', name: 'Alice' });
  });

  it('should retrieve values in values()', async () => {
    const query: Query = { sql: `SELECT * FROM users`, params: [] } as Query;

    const preparedQuery = new PowerSyncSQLitePreparedQuery(powerSyncDb, query, loggerMock, undefined, 'all', false);

    const values = await preparedQuery.values();
    expect(values).toEqual([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' }
    ]);
  });
});
