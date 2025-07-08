import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import {
  AbstractPowerSyncDatabase,
  column,
  LockContext,
  PowerSyncDatabase,
  Schema,
  Table
} from '@powersync/react-native';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Chance from 'chance';
import { v4 } from 'uuid';
import { beforeEach, describe, it } from '../mocha/MochaRNAdapter';
import { numberName, randomIntFromInterval } from './utils';

const chance = new Chance();
use(chaiAsPromised);

function generateUserInfo() {
  return {
    id: v4(),
    name: chance.name(),
    age: chance.integer({ min: 0, max: 100 }),
    networth: chance.floating({ min: 0, max: 1000000 })
  };
}

function createTestUser(context: LockContext) {
  const { name, age, networth } = generateUserInfo();
  return context.execute('INSERT INTO users (id, name, age, networth) VALUES(uuid(), ?, ?, ?)', [name, age, networth]);
}

const AppSchema = new Schema({
  users: new Table({
    name: column.text,
    age: column.integer,
    networth: column.real
  }),
  t1: new Table({
    a: column.integer,
    b: column.integer,
    c: column.text
  })
});

const createDatabase = () => {
  return new PowerSyncDatabase({
    database: new OPSqliteOpenFactory({
      dbFilename: 'sqlitetest.db'
    }),
    schema: AppSchema
  });
};

let db: AbstractPowerSyncDatabase;

export function registerBaseTests() {
  describe('Raw queries', () => {
    beforeEach(async () => {
      if (db) {
        await db.disconnectAndClear();
        await db.close();
      }
      db = createDatabase();
      await db.init();
    });

    it('Insert', async () => {
      const res = await createTestUser(db);
      expect(res.rows?._array).to.eql([]);
      expect(res.rows?.length).to.equal(0);
      expect(res.rows?.item).to.be.a('function');
    });

    it('Query without params', async () => {
      const { name, age, networth } = generateUserInfo();
      await db.execute('INSERT INTO users (id, name, age, networth) VALUES(uuid(), ?, ?, ?)', [name, age, networth]);

      const res = await db.execute('SELECT name, age, networth FROM users');

      expect(res.rows?.length).to.equal(1);

      console.log(
        JSON.stringify(res.rows?._array),
        JSON.stringify([
          {
            name,
            age,
            networth
          }
        ])
      );

      expect(res.rows?._array).to.eql([
        {
          name,
          age,
          networth
        }
      ]);
    });

    it('Query with params', async () => {
      const { id, name, age, networth } = generateUserInfo();
      await db.execute('INSERT INTO users (id, name, age, networth) VALUES(?, ?, ?, ?)', [id, name, age, networth]);

      const res = await db.execute('SELECT name, age, networth FROM users WHERE id = ?', [id]);

      expect(res.rows?._array).to.eql([
        {
          name,
          age,
          networth
        }
      ]);
    });

    it('Failed insert', async () => {
      const { name, networth } = generateUserInfo();
      let errorThrown = false;
      try {
        await db.execute('INSERT INTO usersfail (id, name, age, networth) VALUES(uuid(), ?, ?, ?)', [
          name,
          name,
          networth
        ]);
      } catch (e: any) {
        errorThrown = true;
        expect(typeof e).to.equal('object');
        expect(e.message).to.include(`no such table`);
      }
      expect(errorThrown).to.equal(true);
    });

    it('Transaction, auto commit', async () => {
      const { name, age, networth } = generateUserInfo();

      await db.writeTransaction(async (tx) => {
        const res = await tx.execute('INSERT INTO "users" (id, name, age, networth) VALUES(uuid(), ?, ?, ?)', [
          name,
          age,
          networth
        ]);

        expect(res.rows?._array).to.eql([]);
        expect(res.rows?.length).to.equal(0);
        expect(res.rows?.item).to.be.a('function');
      });

      const res = await db.execute('SELECT name, age, networth FROM users');
      expect(res.rows?._array).to.eql([
        {
          name,
          age,
          networth
        }
      ]);
    });

    it('Transaction, auto rollback', async () => {
      const { name, age, networth } = generateUserInfo();

      try {
        await db.writeTransaction(async (tx) => {
          await tx.execute('INSERT INTO "users" (id, name, age, networth) VALUES(uuid(), ?, ?, ?)', [
            name,
            age,
            networth
          ]);
        });
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message)
          .to.include('SQL execution error')
          .and.to.include('cannot store TEXT value in INT column users.id');

        const res = await db.execute('SELECT * FROM users');
        expect(res.rows?._array).to.eql([]);
      }
    });

    it('Transaction, manual commit', async () => {
      const { name, age, networth } = generateUserInfo();

      await db.writeTransaction(async (tx) => {
        await tx.execute('INSERT INTO "users" (id, name, age, networth) VALUES(uuid(), ?, ?, ?)', [
          name,
          age,
          networth
        ]);
        await tx.commit();
      });

      const res = await db.execute('SELECT name, age, networth FROM users');
      expect(res.rows?._array).to.eql([
        {
          name,
          age,
          networth
        }
      ]);
    });

    it('Transaction, manual rollback', async () => {
      const { name, age, networth } = generateUserInfo();

      await db.writeTransaction(async (tx) => {
        await tx.execute('INSERT INTO "users" (id, name, age, networth) VALUES(uuid(), ?, ?, ?)', [
          name,
          age,
          networth
        ]);
        await tx.rollback();
      });

      const res = await db.execute('SELECT * FROM users');
      expect(res.rows?._array).to.eql([]);
    });

    /**
     * The lock manager will attempt to free the connection lock
     * as soon as the callback resolves, but it should also
     * correctly await any queued work such as tx.rollback();
     */
    it('Transaction, manual rollback, forgot await', async () => {
      const { name, age, networth } = generateUserInfo();

      await db.writeTransaction(async (tx) => {
        await tx.execute('INSERT INTO "users" (id, name, age, networth) VALUES(uuid(), ?, ?, ?)', [
          name,
          age,
          networth
        ]);
        // Purposely forget await to this.
        tx.rollback();
      });

      const res = await db.execute('SELECT * FROM users');
      expect(res.rows?._array).to.eql([]);
    });

    it('Transaction, executed in order', async () => {
      // ARRANGE: Setup for multiple transactions
      const iterations = 10;
      const actual: unknown[] = [];

      // ARRANGE: Generate expected data
      const id = v4();
      const name = chance.name();
      const age = chance.integer();

      // ACT: Start multiple async transactions to upsert and select the same record
      const promises = [];
      for (let iteration = 1; iteration <= iterations; iteration++) {
        const promised = db.writeTransaction(async (tx) => {
          // ACT: Upsert statement to create record / increment the value
          await tx.execute(
            `
              INSERT OR REPLACE INTO [users] ([id], [name], [age], [networth])
              SELECT ?, ?, ?,
                IFNULL((
                  SELECT [networth] + 1000
                  FROM [users]
                  WHERE [id] = ?
                ), 0)
          `,
            [id, name, age, id]
          );

          // ACT: Select statement to get incremented value and store it for checking later
          const results = await tx.execute('SELECT [networth] FROM [users] WHERE [id] = ?', [id]);

          actual.push(results.rows?._array[0].networth);
        });

        promises.push(promised);
      }

      // ACT: Wait for all transactions to complete
      await Promise.all(promises);

      // ASSERT: That the expected values where returned
      const expected = Array(iterations)
        .fill(0)
        .map((_, index) => index * 1000);
      expect(actual).to.eql(expected, 'Each transaction should read a different value');
    });

    it('Write lock, rejects on callback error', async () => {
      const promised = db.writeLock(async () => {
        throw new Error('Error from callback');
      });

      // ASSERT: should return a promise that eventually rejects
      expect(promised).to.have.property('then').that.is.a('function');
      try {
        await promised;
        expect.fail('Should not resolve');
      } catch (e) {
        expect(e).to.be.a.instanceof(Error);
        expect((e as Error)?.message).to.equal('Error from callback');
      }
    });

    it('Transaction, rejects on callback error', async () => {
      const promised = db.writeTransaction(async () => {
        throw new Error('Error from callback');
      });

      // ASSERT: should return a promise that eventually rejects
      expect(promised).to.have.property('then').that.is.a('function');
      try {
        await promised;
        expect.fail('Should not resolve');
      } catch (e) {
        expect(e).to.be.a.instanceof(Error);
        expect((e as Error)?.message).to.equal('Error from callback');
      }
    });

    it('Transaction, rejects on invalid query', async () => {
      const promised = db.writeTransaction(async (tx) => {
        await tx.execute('SELECT * FROM [tableThatDoesNotExist];');
      });

      // ASSERT: should return a promise that eventually rejects
      expect(promised).to.have.property('then').that.is.a('function');
      try {
        await promised;
        expect.fail('Should not resolve');
      } catch (e) {
        expect(e).to.be.a.instanceof(Error);
        expect((e as Error)?.message).to.include('no such table: tableThatDoesNotExist');
      }
    });

    it('Batch execute', async () => {
      const { id: id1, name: name1, age: age1, networth: networth1 } = generateUserInfo();
      const { id: id2, name: name2, age: age2, networth: networth2 } = generateUserInfo();

      const sql = `INSERT INTO "users" (id, name, age, networth) VALUES(?, ?, ?, ?)`;
      const params = [
        [id1, name1, age1, networth1],
        [id2, name2, age2, networth2]
      ];

      await db.executeBatch(sql, params);

      const expected = [
        { id: id1, name: name1, age: age1, networth: networth1 },
        {
          id: id2,
          name: name2,
          age: age2,
          networth: networth2
        }
      ].sort((a, b) => a.name.localeCompare(b.name));

      const res = await db.execute('SELECT id, name, age, networth FROM users ORDER BY name');
      expect(res.rows?._array).to.eql(expected);
    });

    it('Read lock should be read only', async () => {
      const { id, name, age, networth } = generateUserInfo();

      try {
        await db.readLock(async (context) => {
          await context.execute('INSERT INTO "users" (id, name, age, networth) VALUES(?, ?, ?, ?)', [
            id,
            name,
            age,
            networth
          ]);
        });
        throw new Error('Did not throw');
      } catch (ex: any) {
        expect(ex.message).to.include('attempt to write a readonly database');
      }
    });

    it('Read locks should queue if exceed number of connections', async () => {
      const { id, name, age, networth } = generateUserInfo();

      await db.execute('INSERT INTO "users" (id, name, age, networth) VALUES(?, ?, ?, ?)', [id, name, age, networth]);

      const numberOfReads = 20;
      const lockResults = await Promise.all(
        new Array(numberOfReads)
          .fill(0)
          .map(() => db.readLock((context) => context.execute('SELECT * FROM users WHERE name = ?', [name])))
      );

      expect(lockResults.map((r) => r.rows?.item(0).name)).to.deep.equal(new Array(numberOfReads).fill(name));
    });

    it('Multiple reads should occur at the same time', async () => {
      const messages: string[] = [];

      let lock1Resolve: (() => void) | null = null;
      const lock1Promise = new Promise<void>((resolve) => {
        lock1Resolve = resolve;
      });

      // This wont resolve or free until another connection free's it
      const p1 = db.readLock(async () => {
        await lock1Promise;
        messages.push('At the end of 1');
      });

      let lock2Resolve: (() => void) | null = null;
      const lock2Promise = new Promise<void>((resolve) => {
        lock2Resolve = resolve;
      });
      const p2 = db.readLock(async () => {
        // If we get here, then we have a lock open (even though above is locked)
        await lock2Promise;
        lock1Resolve?.();
        messages.push('At the end of 2');
      });

      const p3 = db.readLock(async () => {
        lock2Resolve?.();
        messages.push('At the end of 3');
      });

      await Promise.all([p1, p2, p3]);

      expect(messages).deep.equal(['At the end of 3', 'At the end of 2', 'At the end of 1']);
    });

    it('Should be able to read while a write is running', async () => {
      let lock1Resolve: (() => void) | null = null;
      const lock1Promise = new Promise<void>((resolve) => {
        lock1Resolve = resolve;
      });

      // This wont resolve or free until another connection free's it
      db.writeLock(async () => {
        await lock1Promise;
      });

      const result = await db.readLock(async () => {
        // Read logic could execute here while writeLock is still open
        lock1Resolve?.();
        return 42;
      });

      expect(result).to.equal(42);
    });

    it('Should queue simultaneous executions', async () => {
      let order: number[] = [];

      const operationCount = 5;
      // This wont resolve or free until another connection free's it
      await db.writeLock(async (context) => {
        await Promise.all(
          Array(operationCount)
            .fill(0)
            .map(async (x: number, index: number) => {
              try {
                await context.execute('SELECT * FROM users');
                order.push(index);
              } catch (ex) {
                console.error(ex);
              }
            })
        );
      });

      expect(order).to.deep.equal(
        Array(operationCount)
          .fill(0)
          .map((x, index) => index)
      );
    });

    it('Should call update hook on changes', async () => {
      const controller = new AbortController();
      const result = new Promise<void>((resolve) =>
        db.onChange(
          {
            onChange: () => {
              resolve();
              controller.abort();
            }
          },
          {
            tables: ['users'],
            signal: controller.signal
          }
        )
      );

      const { id, name, age, networth } = generateUserInfo();

      await db.execute('INSERT INTO "users" (id, name, age, networth) VALUES(?, ?, ?, ?)', [id, name, age, networth]);

      await result;
    });

    it('Should reflect writeTransaction updates on read connections', async () => {
      const watched = new Promise<void>((resolve) => {
        const abort = new AbortController();
        db.watch(
          'SELECT COUNT(*) as count FROM users',
          [],
          {
            onResult: (results) => {
              if (results.rows?.item(0).count == 1) {
                resolve();
                abort.abort();
              }
            }
          },
          {
            signal: abort.signal
          }
        );
      });

      await db.writeTransaction(async (tx) => {
        return createTestUser(tx);
      });

      // The watched query should have updated
      await watched;
    });

    it('Should reflect writeTransaction updates on read connections (iterator)', async () => {
      const watched = new Promise<void>(async (resolve) => {
        for await (const result of db.watch('SELECT COUNT(*) as count FROM users', [])) {
          if (result.rows?.item(0).count == 1) {
            resolve();
          }
        }
      });

      await db.writeTransaction(async (tx) => {
        return createTestUser(tx);
      });

      // The watched query should have updated
      await watched;
    });

    it('Should throw for async iterator watch errors', async () => {
      let error: Error | undefined;
      try {
        // The table here does not exist, so it should throw an error
        for await (const result of db.watch('SELECT COUNT(*) as count FROM faketable', [])) {
        }
      } catch (ex) {
        error = ex as Error;
      }

      expect(error!.message).to.include('no such table: faketable');
    });

    it('Should throw for async iterator invalid query errors', async () => {
      let error: Error | undefined;
      try {
        // Invalid SQL
        for await (const result of db.watch('invalidsyntax', [])) {
        }
      } catch (ex) {
        error = ex as Error;
      }

      expect(error!.message).to.include('sqlite query error');
    });

    it('Should reflect writeLock updates on read connections ', async () => {
      const numberOfUsers = 1000;

      const watched = new Promise<void>((resolve) => {
        const abort = new AbortController();
        db.watch(
          'SELECT COUNT(*) as count FROM users',
          [],
          {
            onResult: (results) => {
              if (results.rows?.item(0).count == numberOfUsers) {
                resolve();
                abort.abort();
              }
            }
          },
          {
            signal: abort.signal
          }
        );
      });

      await db.writeLock(async (tx) => {
        await tx.execute('BEGIN');
        for (let i = 0; i < numberOfUsers; i++) {
          await tx.execute('INSERT INTO users (id, name, age, networth) VALUES(uuid(), ?, ?, ?)', ['steven', i, 0]);
        }
        await tx.execute('COMMIT');
      });

      // The query result length for 1 item should be returned for all connections
      await watched;
    });

    it('500 INSERTs', async () => {
      let start = performance.now();
      for (let i = 0; i < 500; ++i) {
        const n = randomIntFromInterval(0, 100000);
        await db.execute(`INSERT INTO t1(id, a, b, c) VALUES(uuid(), ?, ?, ?)`, [i + 1, n, numberName(n)]);
      }
      await db.execute('PRAGMA wal_checkpoint(RESTART)');
      let end = performance.now();
      let duration = end - start;

      expect(duration).lessThan(2000);
    });

    it('Should handle multiple closes', async () => {
      // Bulk insert 10000 rows without using a transaction
      const bulkInsertCommands = [];
      const statement = `INSERT INTO t1(id, c) VALUES(uuid(), ?)`;

      for (let i = 0; i < 10000; i++) {
        bulkInsertCommands.push([[`value${i + 1}`]]);
      }

      await db.executeBatch(statement, bulkInsertCommands);
      await db.close();

      for (let i = 1; i < 10; i++) {
        db = createDatabase();
        await db.init();

        // ensure a regular query works
        const pExecute = await db.execute(`SELECT * FROM t1 `);
        expect(pExecute.rows?.length).to.equal(10000);

        // Queue a bunch of write locks, these will fail due to the db being closed
        // before they are accepted.
        const tests = [
          db.execute(`SELECT * FROM t1 `),
          db.execute(`SELECT * FROM t1 `),
          db.execute(`SELECT * FROM t1 `),
          db.execute(`SELECT * FROM t1 `)
        ];

        await db.close();

        const results = await Promise.allSettled(tests);
        expect(results.map((r) => r.status)).deep.equal(Array(tests.length).fill('rejected'));
      }
    });
  });
}
