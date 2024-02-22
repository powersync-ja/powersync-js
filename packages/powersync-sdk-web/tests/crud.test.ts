import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AbstractPowerSyncDatabase,
  Column,
  ColumnType,
  CrudEntry,
  Index,
  IndexedColumn,
  Schema,
  Table,
  UpdateType
} from '@journeyapps/powersync-sdk-common';
import { WASQLitePowerSyncDatabaseOpenFactory } from '@journeyapps/powersync-sdk-web';

const testId = '2290de4f-0488-4e50-abed-f8e8eb1d0b42';

const schema = new Schema([
  new Table({
    name: 'assets',
    columns: [
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'make', type: ColumnType.TEXT }),
      new Column({ name: 'model', type: ColumnType.TEXT }),
      new Column({ name: 'serial_number', type: ColumnType.TEXT }),
      new Column({ name: 'quantity', type: ColumnType.INTEGER }),
      new Column({ name: 'user_id', type: ColumnType.TEXT }),
      new Column({ name: 'customer_id', type: ColumnType.TEXT }),
      new Column({ name: 'description', type: ColumnType.TEXT })
    ],
    indexes: [
      new Index({
        name: 'makemodel',
        columns: [new IndexedColumn({ name: 'make' }), new IndexedColumn({ name: 'model' })]
      })
    ]
  }),

  new Table({
    name: 'customers',
    columns: [new Column({ name: 'name', type: ColumnType.TEXT }), new Column({ name: 'email', type: ColumnType.TEXT })]
  })
]);

describe('CRUD Tests', () => {
  const factory = new WASQLitePowerSyncDatabaseOpenFactory({
    dbFilename: 'test.db',
    schema
  });

  let powersync: AbstractPowerSyncDatabase;

  beforeEach(async () => {
    await powersync?.disconnectAndClear();
    powersync = factory.getInstance();
  });

  afterEach(async () => {
    await powersync.disconnectAndClear();
    await powersync.close();
  });

  it('INSERT', async () => {
    expect(await powersync.getAll('SELECT * FROM ps_crud')).deep.equals([]);

    await powersync.execute('INSERT INTO assets(id, description) VALUES(?, ?)', [testId, 'test']);

    expect(await powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
      {
        data: `{"op":"PUT","type":"assets","id":"${testId}","data":{"description":"test"}}`
      }
    ]);

    var tx = (await powersync.getNextCrudTransaction())!;
    expect(tx.transactionId).equals(1);
    expect(tx.crud[0].equals(new CrudEntry(1, UpdateType.PUT, 'assets', testId, 1, { description: 'test' }))).equals(
      true
    );
  });

  it('INSERT OR REPLACE', async () => {
    await powersync.execute('INSERT INTO assets(id, description) VALUES(?, ?)', [testId, 'test']);
    await powersync.execute('DELETE FROM ps_crud WHERE 1');

    // Replace
    await powersync.execute('INSERT OR REPLACE INTO assets(id, description) VALUES(?, ?)', [testId, 'test2']);

    // This generates another PUT
    expect(await powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
      {
        data: `{"op":"PUT","type":"assets","id":"${testId}","data":{"description":"test2"}}`
      }
    ]);

    expect(await powersync.get('SELECT count(*) AS count FROM assets')).deep.equals({ count: 1 });

    // Make sure uniqueness is enforced
    expect(powersync.execute('INSERT INTO assets(id, description) VALUES(?, ?)', [testId, 'test3'])).rejects.toThrow(
      /UNIQUE constraint failed/
    );
  });

  it('UPDATE', async () => {
    await powersync.execute('INSERT INTO assets(id, description, make) VALUES(?, ?, ?)', [testId, 'test', 'test']);
    await powersync.execute('DELETE FROM ps_crud WHERE 1');

    await powersync.execute('UPDATE assets SET description = ? WHERE id = ?', ['test2', testId]);

    expect(await powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
      {
        data: `{"op":"PATCH","type":"assets","id":"${testId}","data":{"description":"test2"}}`
      }
    ]);

    var tx = (await powersync.getNextCrudTransaction())!;
    expect(tx.transactionId).equals(3);

    expect(tx.crud[0].equals(new CrudEntry(2, UpdateType.PATCH, 'assets', testId, 3, { description: 'test2' }))).equals(
      true
    );
  });

  // it('DELETE', async () => {
  //   await powersync.execute('INSERT INTO assets(id, description, make) VALUES(?, ?, ?)', [testId, 'test', 'test']);
  //   await powersync.execute('DELETE FROM ps_crud WHERE 1');

  //   await powersync.execute('DELETE FROM assets WHERE id = ?', [testId]);

  //   expect(await powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).equals([
  //     { data: '{"op":"DELETE","type":"assets","id":"$testId"}' }
  //   ]);

  //   var tx = (await powersync.getNextCrudTransaction())!;
  //   expect(tx.transactionId).equals(3);
  //   expect(tx.crud[0].equals(new CrudEntry(2, UpdateType.DELETE, 'assets', testId, 3))).equals(true);
  // });

  // it('UPSERT not supported', async () => {
  //   // Just shows that we cannot currently do this
  //   expect(
  //     powersync.execute(
  //       'INSERT INTO assets(id, description) VALUES(?, ?) ON CONFLICT DO UPDATE SET description = ?',
  //       [testId, 'test2', 'test3']
  //     )
  //   ).throws('cannot UPSERT a view');
  // });

  // //   it('INSERT-only tables', () => {
  // //     await powersync.disconnectAndClear();
  // //     powersync = await setupPowerSync(
  // //         path: path,
  // //         schema: const Schema([
  // //           Table.insertOnly(
  // //               'logs', [Column.text('level'), Column.text('content')])
  // //         ]));
  // //     expect(await powersync.getAll('SELECT * FROM ps_crud'), equals([]));
  // //     await powersync.execute(
  // //         'INSERT INTO logs(id, level, content) VALUES(?, ?, ?)',
  // //         [testId, 'INFO', 'test log']);

  // //     expect(
  // //         await powersync.getAll('SELECT data FROM ps_crud ORDER BY id'),
  // //         equals([
  // //           {
  // //             'data':
  // //                 '{"op":"PUT","type":"logs","id":"$testId","data":{"level":"INFO","content":"test log"}}'
  // //           }
  // //         ]));

  // //     expect(await powersync.getAll('SELECT * FROM logs'), equals([]));

  // //     var tx = (await powersync.getNextCrudTransaction())!;
  // //     expect(tx.transactionId, equals(2));
  // //     expect(
  // //         tx.crud,
  // //         equals([
  // //           CrudEntry(1, UpdateType.put, 'logs', testId, 2,
  // //               {"level": "INFO", "content": "test log"})
  // //         ]));
  // //   });

  // it('big numbers - integer', async () => {
  //   const bigNumber = 1 << 62;
  //   await powersync.execute('INSERT INTO assets(id, quantity) VALUES(?, ?)', [testId, bigNumber]);

  //   expect(await powersync.get('SELECT quantity FROM assets WHERE id = ?', [testId])).equals({ quantity: bigNumber });
  //   expect(await powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).equals([
  //     {
  //       data: `{"op":"PUT","type":"assets","id":"$testId","data":{"quantity":${bigNumber}}}`
  //     }
  //   ]);

  //   var tx = (await powersync.getNextCrudTransaction())!;
  //   expect(tx.transactionId).equals(1);

  //   expect(tx.crud[0].equals(new CrudEntry(1, UpdateType.PUT, 'assets', testId, 1, { quantity: bigNumber }))).equals(
  //     true
  //   );
  // });

  // it('big numbers - text', async () => {
  //   const bigNumber = 1 << 62;
  //   await powersync.execute('INSERT INTO assets(id, quantity) VALUES(?, ?)', [testId, '$bigNumber']);

  //   // Cast as INTEGER when querying
  //   expect(await powersync.get('SELECT quantity FROM assets WHERE id = ?', [testId])).equals({ quantity: bigNumber });

  //   // Not cast as part of crud / persistance
  //   expect(await powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).equals([
  //     {
  //       data: `{"op":"PUT","type":"assets","id":"$testId","data":{"quantity":"${bigNumber}"}}`
  //     }
  //   ]);

  //   await powersync.execute('DELETE FROM ps_crud WHERE 1');

  //   await powersync.execute('UPDATE assets SET description = ?, quantity = quantity + 1 WHERE id = ?', [
  //     'updated',
  //     testId
  //   ]);

  //   expect(await powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).equals([
  //     {
  //       data: `{"op":"PATCH","type":"assets","id":"$testId","data":{"quantity":${bigNumber + 1},"description":"updated"}}`
  //     }
  //   ]);
  // });

  // it('Transaction grouping', async () => {
  //   expect(await powersync.getAll('SELECT * FROM ps_crud')).equals([]);
  //   await powersync.writeTransaction(async (tx) => {
  //     await tx.execute('INSERT INTO assets(id, description) VALUES(?, ?)', [testId, 'test1']);
  //     await tx.execute('INSERT INTO assets(id, description) VALUES(?, ?)', ['test2', 'test2']);
  //   });

  //   await powersync.writeTransaction(async (tx) => {
  //     await tx.execute('UPDATE assets SET description = ? WHERE id = ?', ['updated', testId]);
  //   });

  //   var tx1 = (await powersync.getNextCrudTransaction())!;
  //   expect(tx1.transactionId).equals(1);
  //   // expect(
  //   //     tx1.crud,
  //   //     equals([
  //   //       CrudEntry(1, UpdateType.put, 'assets', testId, 1,
  //   //           {"description": "test1"}),
  //   //       CrudEntry(2, UpdateType.put, 'assets', 'test2', 1,
  //   //           {"description": "test2"})
  //   //     ]));
  //   await tx1.complete();

  //   var tx2 = (await powersync.getNextCrudTransaction())!;
  //   expect(tx2.transactionId).equals(2);
  //   // expect(
  //   //     tx2.crud,
  //   //     equals([
  //   //       CrudEntry(3, UpdateType.patch, 'assets', testId, 2,
  //   //           {"description": "updated"}),
  //   //     ]));
  //   await tx2.complete();
  //   expect(await powersync.getNextCrudTransaction()).equals(null);
  // });
});
