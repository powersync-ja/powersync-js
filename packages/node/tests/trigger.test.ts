import { DiffTriggerOperation, TriggerDiffResult } from '@powersync/common';
// import 'source-map-support/register';
import { vi } from 'vitest';
import { databaseTest } from './utils';

databaseTest('triggers', { timeout: 100_000 }, async ({ database }) => {
  const tempTable = 'remote_lists';

  await database.triggers.createDiffTrigger({
    source: 'ps_data__lists',
    destination: tempTable,
    columns: ['name'],
    operations: [DiffTriggerOperation.INSERT, DiffTriggerOperation.UPDATE]
  });

  const results = [] as TriggerDiffResult[];

  database.onChange(
    {
      onChange: async (change) => {
        // This callback async processed
        await database.writeLock(async (tx) => {
          // API exposes a context to run things here.
          // using execute seems to be important on Node.js
          // the temp table is not present if using getAll
          const changes = await tx.execute(/* sql */ `
            SELECT
              *
            FROM
              ${tempTable}
          `);

          results.push(...(changes.rows?._array || []));

          await tx.execute(/* sql */ ` DELETE FROM ${tempTable}; `);
        });
      }
    },
    { tables: [tempTable] }
  );

  await database.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?);', ['test list']);

  await database.execute(`UPDATE lists SET name = 'wooo'`);

  vi.waitFor(
    () => {
      expect(results.length).toEqual(2);
      expect(results[0].operation).toEqual('INSERT');
      expect(results[1].operation).toEqual('UPDATE');
    },
    { timeout: 1000 }
  );
});
