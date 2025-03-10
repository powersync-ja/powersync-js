import { AbstractPowerSyncDatabase } from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeOptionalSyncSchema } from './utils/optionalSyncTestSchema';

const assetId = '2290de4f-0488-4e50-abed-f8e8eb1d0b42';
const userId = '3390de4f-0488-4e50-abed-f8e8eb1d0b42';
const customerId = '4490de4f-0488-4e50-abed-f8e8eb1d0b42';

describe('Schema Tests', { sequential: true }, () => {
  let db: AbstractPowerSyncDatabase;

  beforeEach(async () => {
    db = new PowerSyncDatabase({
      /**
       * Deleting the IndexDB seems to freeze the test.
       * Use a new DB for each run to keep CRUD counters
       * consistent
       */
      database: { dbFilename: 'test.db' },
      schema: makeOptionalSyncSchema(false),
      flags: {
        enableMultiTabs: false
      }
    });
  });

  afterEach(async () => {
    await db.disconnectAndClear();
    await db.close();
  });

  it('Switch from offline-only to online schema', async () => {
    await db.execute('INSERT INTO customers(id, name, email) VALUES(?, ?, ?)', [
      customerId,
      'test customer',
      'test@example.org'
    ]);

    await db.execute('INSERT INTO assets(id, description, customer_id) VALUES(?, ?, ?)', [assetId, 'test', customerId]);
    await db.execute('UPDATE assets SET description = description || ?', ['.']);

    expect(await db.getAll('SELECT data FROM ps_crud ORDER BY id')).toEqual([]);

    // Now switch to the "online" schema
    await db.updateSchema(makeOptionalSyncSchema(true));

    // Note that updateSchema cannot be called inside a transaction, and there
    // is a possibility of crash between updating the schema, and when the data
    // has been moved. It may be best to attempt the data move on every application
    // start where the online schema is used, if there is any local_ data still present.

    await db.writeTransaction(async (tx) => {
      // Copy local data to the "online" views.
      // This records each operation to the crud queue.
      await tx.execute('INSERT INTO customers SELECT * FROM inactive_local_customers');
      await tx.execute(
        'INSERT INTO assets(id, description, customer_id, user_id) SELECT id, description, customer_id, ? FROM inactive_local_assets',
        [userId]
      );

      // Delete the "offline-only" data.
      await tx.execute('DELETE FROM inactive_local_customers');
      await tx.execute('DELETE FROM inactive_local_assets');
    });

    const crud = (await db.getAll<{ data: string }>('SELECT data FROM ps_crud ORDER BY id')).map((d) =>
      JSON.parse(d.data)
    );

    expect(crud).toEqual([
      {
        op: 'PUT',
        type: 'customers',
        id: customerId,
        data: { email: 'test@example.org', name: 'test customer' }
      },
      {
        op: 'PUT',
        type: 'assets',
        id: assetId,
        data: {
          user_id: userId,
          customer_id: customerId,
          description: 'test.'
        }
      }
    ]);
  });

  // Indicates that we don't need to refresh the the schema explicitly
  it('Correct source table after switching schema', async () => {
    const customerWatchTables = await getSourceTables(db, 'SELECT * FROM customers');
    expect(customerWatchTables.includes('ps_data_local__local_customers')).toBeTruthy();

    await db.updateSchema(makeOptionalSyncSchema(true));

    const onlineCustomerWatchTables = await getSourceTables(db, 'SELECT * FROM customers');
    expect(onlineCustomerWatchTables.includes('ps_data__customers')).toBeTruthy();
  });
});

export async function getSourceTables(db: AbstractPowerSyncDatabase, sql: string, parameters: Array<any> = []) {
  const rows = await db.getAll<{ opcode: string; p3: number; p2: string }>(`EXPLAIN ${sql}`, parameters);
  const rootpages: number[] = [];

  for (const row of rows) {
    if (row.opcode === 'OpenRead' && row.p3 === 0 && typeof row.p2 === 'number') {
      rootpages.push(row.p2);
    }
  }

  const tableRows = await db.getAll<{ tbl_name: string }>(
    `SELECT tbl_name FROM sqlite_master WHERE rootpage IN (SELECT json_each.value FROM json_each(?))`,
    [JSON.stringify(rootpages)]
  );

  return tableRows.map((row: { tbl_name: string }) => row.tbl_name);
}
