import Chance from 'chance';
import { beforeEach, describe, it } from '../mocha/MochaRNAdapter';
import chai from 'chai';
import { randomIntFromInterval, numberName } from './utils';

import { DBAdapter } from '@powersync/common/src/db/DBAdapter';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';

let factory: OPSqliteOpenFactory;
let db: DBAdapter;

const { expect } = chai;
const chance = new Chance();

export function registerBaseTests() {
  beforeEach(async () => {
    try {
      if (db) {
        db.close();
      }

      factory = new OPSqliteOpenFactory({
        dbFilename: 'test.db'
      });

      db = factory.openDB();

      await db.execute('DROP TABLE IF EXISTS User; ');
      await db.execute('CREATE TABLE User ( id INT PRIMARY KEY, name TEXT NOT NULL, age INT, networth REAL) STRICT;');

      await db.execute('CREATE TABLE IF NOT EXISTS t1(id INTEGER PRIMARY KEY, a INTEGER, b INTEGER, c TEXT)');
    } catch (e) {
      console.warn('error on before each', e);
    }
  });

  describe('PowerSync', () => {
    it('should load the extension', async () => {
      const rs = await db.execute('select powersync_rs_version() as version');
      // TODO: Check the version?
      // expect(rs.rows.item(0).version).to.equal('0.2.0...');
    });
  });
}

function generateUserInfo() {
  return {
    id: chance.integer(),
    name: chance.name(),
    age: chance.integer(),
    networth: chance.floating()
  };
}

// function createTestUser(context: { execute: (sql: string, args?: any[]) => Promise<QueryResult> } = db) {
//   const { id, name, age, networth } = generateUserInfo();
//   return context.execute('INSERT INTO User (id, name, age, networth) VALUES(?, ?, ?, ?)', [id, name, age, networth]);
// }

// /**
//  * Creates read locks then queries the User table.
//  * Returns an array of promises which resolve once each
//  * read connection contains rows.
//  */
// const createReaders = (callbacks: Array<() => void>) =>
//   new Array(NUM_READ_CONNECTIONS).fill(null).map(() => {
//     return db.readLock(async (tx) => {
//       return new Promise<number>((resolve) => {
//         // start a read lock for each connection
//         callbacks.push(async () => {
//           const result = await tx.execute('SELECT * from User');
//           const length = result.rows?.length;
//           console.log(`Reading Users returned ${length} rows`);
//           resolve(result.rows?.length);
//         });
//       });
//     });
//   });

// export function registerBaseTests() {
//   beforeEach(async () => {
//     try {
//       if (db) {
//         db.close();
//         db.delete();
//       }

//       global.db = db = open('test', {
//         numReadConnections: NUM_READ_CONNECTIONS
//       });

//       await db.execute('DROP TABLE IF EXISTS User; ');
//       await db.execute('CREATE TABLE User ( id INT PRIMARY KEY, name TEXT NOT NULL, age INT, networth REAL) STRICT;');

//       await db.execute('CREATE TABLE IF NOT EXISTS t1(id INTEGER PRIMARY KEY, a INTEGER, b INTEGER, c TEXT)');
//     } catch (e) {
//       console.warn('error on before each', e);
//     }
//   });

//   describe('PowerSync', () => {
//     it('should load the extension', async () => {
//       const rs = await db.execute('select powersync_rs_version() as version');
//       // TODO: Check the version?
//       // expect(rs.rows.item(0).version).to.equal('0.2.0...');
//     });
//   });

//   describe('Raw queries', () => {
//     it('Insert', async () => {
//       const res = await createTestUser();
//       expect(res.rowsAffected).to.equal(1);
//       expect(res.insertId).to.equal(1);
//       expect(res.metadata).to.eql([]);
//       expect(res.rows?._array).to.eql([]);
//       expect(res.rows?.length).to.equal(0);
//       expect(res.rows?.item).to.be.a('function');
//     });

//     it('Query without params', async () => {
//       const { id, name, age, networth } = generateUserInfo();
//       await db.execute('INSERT INTO User (id, name, age, networth) VALUES(?, ?, ?, ?)', [id, name, age, networth]);

//       const res = await db.execute('SELECT * FROM User');

//       expect(res.rowsAffected).to.equal(1);
//       expect(res.insertId).to.equal(1);
//       expect(res.rows?._array).to.eql([
//         {
//           id,
//           name,
//           age,
//           networth
//         }
//       ]);
//     });

//     it('Query with params', async () => {
//       const { id, name, age, networth } = generateUserInfo();
//       await db.execute('INSERT INTO User (id, name, age, networth) VALUES(?, ?, ?, ?)', [id, name, age, networth]);

//       const res = await db.execute('SELECT * FROM User WHERE id = ?', [id]);

//       expect(res.rowsAffected).to.equal(1);
//       expect(res.insertId).to.equal(1);
//       expect(res.rows?._array).to.eql([
//         {
//           id,
//           name,
//           age,
//           networth
//         }
//       ]);
//     });

//     it('Failed insert', async () => {
//       const id = chance.string(); // Setting the id to a string will throw an exception, it expects an int
//       const { name, age, networth } = generateUserInfo();
//       let errorThrown = false;
//       try {
//         await db.execute('INSERT INTO User (id, name, age, networth) VALUES(?, ?, ?, ?)', [id, name, age, networth]);
//       } catch (e: any) {
//         errorThrown = true;
//         expect(typeof e).to.equal('object');
//         expect(e.message).to.include(`cannot store TEXT value in INT column User.id`);
//       }
//       expect(errorThrown).to.equal(true);
//     });

//     it('Transaction, auto commit', async () => {
//       const { id, name, age, networth } = generateUserInfo();

//       await db.writeTransaction(async (tx) => {
//         const res = await tx.execute('INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)', [
//           id,
//           name,
//           age,
//           networth
//         ]);

//         expect(res.rowsAffected).to.equal(1);
//         expect(res.insertId).to.equal(1);
//         expect(res.metadata).to.eql([]);
//         expect(res.rows?._array).to.eql([]);
//         expect(res.rows?.length).to.equal(0);
//         expect(res.rows?.item).to.be.a('function');
//       });

//       const res = await db.execute('SELECT * FROM User');
//       expect(res.rows?._array).to.eql([
//         {
//           id,
//           name,
//           age,
//           networth
//         }
//       ]);
//     });

//     it('Transaction, auto rollback', async () => {
//       const id = chance.string(); // Causes error because it should be an integer
//       const { name, age, networth } = generateUserInfo();

//       try {
//         await db.writeTransaction(async (tx) => {
//           await tx.execute('INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)', [
//             id,
//             name,
//             age,
//             networth
//           ]);
//         });
//       } catch (error) {
//         expect(error).to.be.instanceOf(Error);
//         expect((error as Error).message)
//           .to.include('SQL execution error')
//           .and.to.include('cannot store TEXT value in INT column User.id');

//         const res = await db.execute('SELECT * FROM User');
//         expect(res.rows?._array).to.eql([]);
//       }
//     });

//     it('Transaction, manual commit', async () => {
//       const { id, name, age, networth } = generateUserInfo();

//       await db.writeTransaction(async (tx) => {
//         await tx.execute('INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)', [id, name, age, networth]);
//         await tx.commit();
//       });

//       const res = await db.execute('SELECT * FROM User');
//       expect(res.rows?._array).to.eql([
//         {
//           id,
//           name,
//           age,
//           networth
//         }
//       ]);
//     });

//     it('Transaction, manual rollback', async () => {
//       const { id, name, age, networth } = generateUserInfo();

//       await db.writeTransaction(async (tx) => {
//         await tx.execute('INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)', [id, name, age, networth]);
//         await tx.rollback();
//       });

//       const res = await db.execute('SELECT * FROM User');
//       expect(res.rows?._array).to.eql([]);
//     });

//     /**
//      * The lock manager will attempt to free the connection lock
//      * as soon as the callback resolves, but it should also
//      * correctly await any queued work such as tx.rollback();
//      */
//     it('Transaction, manual rollback, forgot await', async () => {
//       const { id, name, age, networth } = generateUserInfo();

//       await db.writeTransaction(async (tx) => {
//         await tx.execute('INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)', [id, name, age, networth]);
//         // Purposely forget await to this.
//         tx.rollback();
//       });

//       const res = await db.execute('SELECT * FROM User');
//       expect(res.rows?._array).to.eql([]);
//     });

//     it('Transaction, executed in order', async () => {
//       // ARRANGE: Setup for multiple transactions
//       const iterations = 10;
//       const actual: unknown[] = [];

//       // ARRANGE: Generate expected data
//       const id = chance.integer();
//       const name = chance.name();
//       const age = chance.integer();

//       // ACT: Start multiple async transactions to upsert and select the same record
//       const promises = [];
//       for (let iteration = 1; iteration <= iterations; iteration++) {
//         const promised = db.writeTransaction(async (tx) => {
//           // ACT: Upsert statement to create record / increment the value
//           await tx.execute(
//             `
//               INSERT OR REPLACE INTO [User] ([id], [name], [age], [networth])
//               SELECT ?, ?, ?,
//                 IFNULL((
//                   SELECT [networth] + 1000
//                   FROM [User]
//                   WHERE [id] = ?
//                 ), 0)
//           `,
//             [id, name, age, id]
//           );

//           // ACT: Select statement to get incremented value and store it for checking later
//           const results = await tx.execute('SELECT [networth] FROM [User] WHERE [id] = ?', [id]);

//           actual.push(results.rows?._array[0].networth);
//         });

//         promises.push(promised);
//       }

//       // ACT: Wait for all transactions to complete
//       await Promise.all(promises);

//       // ASSERT: That the expected values where returned
//       const expected = Array(iterations)
//         .fill(0)
//         .map((_, index) => index * 1000);
//       expect(actual).to.eql(expected, 'Each transaction should read a different value');
//     });

//     it('Write lock, rejects on callback error', async () => {
//       const promised = db.writeLock(async (tx) => {
//         throw new Error('Error from callback');
//       });

//       // ASSERT: should return a promise that eventually rejects
//       expect(promised).to.have.property('then').that.is.a('function');
//       try {
//         await promised;
//         expect.fail('Should not resolve');
//       } catch (e) {
//         expect(e).to.be.a.instanceof(Error);
//         expect((e as Error)?.message).to.equal('Error from callback');
//       }
//     });

//     it('Transaction, rejects on callback error', async () => {
//       const promised = db.writeTransaction(async (tx) => {
//         throw new Error('Error from callback');
//       });

//       // ASSERT: should return a promise that eventually rejects
//       expect(promised).to.have.property('then').that.is.a('function');
//       try {
//         await promised;
//         expect.fail('Should not resolve');
//       } catch (e) {
//         expect(e).to.be.a.instanceof(Error);
//         expect((e as Error)?.message).to.equal('Error from callback');
//       }
//     });

//     it('Transaction, rejects on invalid query', async () => {
//       const promised = db.writeTransaction(async (tx) => {
//         await tx.execute('SELECT * FROM [tableThatDoesNotExist];');
//       });

//       // ASSERT: should return a promise that eventually rejects
//       expect(promised).to.have.property('then').that.is.a('function');
//       try {
//         await promised;
//         expect.fail('Should not resolve');
//       } catch (e) {
//         expect(e).to.be.a.instanceof(Error);
//         expect((e as Error)?.message).to.include('no such table: tableThatDoesNotExist');
//       }
//     });

//     it('Batch execute', async () => {
//       const { id: id1, name: name1, age: age1, networth: networth1 } = generateUserInfo();
//       const { id: id2, name: name2, age: age2, networth: networth2 } = generateUserInfo();

//       const commands: SQLBatchTuple[] = [
//         ['INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)', [id1, name1, age1, networth1]],
//         ['INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)', [id2, name2, age2, networth2]]
//       ];

//       await db.executeBatch(commands);

//       const res = await db.execute('SELECT * FROM User');
//       expect(res.rows?._array).to.eql([
//         { id: id1, name: name1, age: age1, networth: networth1 },
//         {
//           id: id2,
//           name: name2,
//           age: age2,
//           networth: networth2
//         }
//       ]);
//     });

//     it('Read lock should be read only', async () => {
//       const { id, name, age, networth } = generateUserInfo();

//       try {
//         await db.readLock(async (context) => {
//           await context.execute('INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)', [
//             id,
//             name,
//             age,
//             networth
//           ]);
//         });
//         throw new Error('Did not throw');
//       } catch (ex) {
//         expect(ex.message).to.include('attempt to write a readonly database');
//       }
//     });

//     it('Read locks should queue if exceed number of connections', async () => {
//       const { id, name, age, networth } = generateUserInfo();

//       await db.execute('INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)', [id, name, age, networth]);

//       const numberOfReads = 20;
//       const lockResults = await Promise.all(
//         new Array(numberOfReads)
//           .fill(0)
//           .map(() => db.readLock((context) => context.execute('SELECT * FROM USER WHERE name = ?', [name])))
//       );

//       expect(lockResults.map((r) => r.rows?.item(0).name)).to.deep.equal(new Array(numberOfReads).fill(name));
//     });

//     it('Multiple reads should occur at the same time', async () => {
//       const messages: string[] = [];

//       let lock1Resolve: () => void | null = null;
//       const lock1Promise = new Promise<void>((resolve) => {
//         lock1Resolve = resolve;
//       });

//       // This wont resolve or free until another connection free's it
//       const p1 = db.readLock(async (context) => {
//         await lock1Promise;
//         messages.push('At the end of 1');
//       });

//       let lock2Resolve: () => void | null = null;
//       const lock2Promise = new Promise<void>((resolve) => {
//         lock2Resolve = resolve;
//       });
//       const p2 = db.readLock(async (context) => {
//         // If we get here, then we have a lock open (even though above is locked)
//         await lock2Promise;
//         lock1Resolve();
//         messages.push('At the end of 2');
//       });

//       const p3 = db.readLock(async (context) => {
//         lock2Resolve();
//         messages.push('At the end of 3');
//       });

//       await Promise.all([p1, p2, p3]);

//       expect(messages).deep.equal(['At the end of 3', 'At the end of 2', 'At the end of 1']);
//     });

//     it('Should be able to read while a write is running', async () => {
//       let lock1Resolve: () => void | null = null;
//       const lock1Promise = new Promise<void>((resolve) => {
//         lock1Resolve = resolve;
//       });

//       // This wont resolve or free until another connection free's it
//       db.writeLock(async (context) => {
//         await lock1Promise;
//       });

//       const result = await db.readLock(async (context) => {
//         // Read logic could execute here while writeLock is still open
//         lock1Resolve();
//         return 42;
//       });

//       expect(result).to.equal(42);
//     });

//     it('Should queue simultaneous executions', async () => {
//       let order: number[] = [];

//       const operationCount = 5;
//       // This wont resolve or free until another connection free's it
//       await db.writeLock(async (context) => {
//         await Promise.all(
//           Array(operationCount)
//             .fill(0)
//             .map(async (x: number, index: number) => {
//               try {
//                 await context.execute('SELECT * FROM User');
//                 order.push(index);
//               } catch (ex) {
//                 console.error(ex);
//               }
//             })
//         );
//       });

//       expect(order).to.deep.equal(
//         Array(operationCount)
//           .fill(0)
//           .map((x, index) => index)
//       );
//     });

//     it('Should call update hook on changes', async () => {
//       const result = new Promise<UpdateNotification>((resolve) => db.registerUpdateHook((update) => resolve(update)));

//       const { id, name, age, networth } = generateUserInfo();

//       await db.execute('INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)', [id, name, age, networth]);

//       const update = await result;

//       expect(update.table).to.equal('User');
//     });

//     it('Should open a db without concurrency', async () => {
//       const singleConnection = open('single_connection', {
//         numReadConnections: 0
//       });

//       const [p1, p2] = [
//         singleConnection.writeLock(async () => {
//           await new Promise((resolve) => setTimeout(resolve, 200));
//         }),
//         // Expect an exception and return it
//         singleConnection.readLock(async () => {}, { timeoutMs: 100 }).catch((ex) => ex)
//       ];

//       expect(await p1).to.equal(undefined);

//       expect((await p2).message).to.include('timed out');

//       singleConnection.close();
//     });

//     it('should trigger write transaction commit hooks', async () => {
//       const commitPromise = new Promise<void>((resolve) =>
//         db.listenerManager.registerListener({
//           writeTransaction: (event) => {
//             if (event.type == TransactionEvent.COMMIT) {
//               resolve();
//             }
//           }
//         })
//       );

//       const rollbackPromise = new Promise<void>((resolve) =>
//         db.listenerManager.registerListener({
//           writeTransaction: (event) => {
//             if (event.type == TransactionEvent.ROLLBACK) {
//               resolve();
//             }
//           }
//         })
//       );

//       await db.writeTransaction(async (tx) => tx.rollback());
//       await rollbackPromise;

//       // Need to actually do something for the commit hook to fire
//       await db.writeTransaction(async (tx) => {
//         await createTestUser(tx);
//       });
//       await commitPromise;
//     });

//     it('should batch table update changes', async () => {
//       const updatePromise = new Promise<BatchedUpdateNotification>((resolve) => db.registerTablesChangedHook(resolve));

//       await db.writeTransaction(async (tx) => {
//         await createTestUser(tx);
//         await createTestUser(tx);
//       });

//       const update = await updatePromise;

//       expect(update.rawUpdates.length).to.equal(2);
//     });

//     it('Should reflect writeTransaction updates on read connections', async () => {
//       const readTriggerCallbacks = [];

//       // Execute the read test whenever a table change ocurred
//       db.registerTablesChangedHook((update) => readTriggerCallbacks.forEach((cb) => cb()));

//       // Test writeTransaction
//       const readerPromises = createReaders(readTriggerCallbacks);

//       await db.writeTransaction(async (tx) => {
//         return createTestUser(tx);
//       });

//       let resolved = await Promise.all(readerPromises);
//       // The query result length for 1 item should be returned for all connections
//       expect(resolved).to.deep.equal(readerPromises.map(() => 1));
//     });

//     it('Should reflect writeLock updates on read connections', async () => {
//       const readTriggerCallbacks = [];
//       // Test writeLock
//       const readerPromises = createReaders(readTriggerCallbacks);
//       // Execute the read test whenever a table change ocurred
//       db.registerTablesChangedHook((update) => readTriggerCallbacks.forEach((cb) => cb()));

//       const numberOfUsers = 100_000;
//       await db.writeLock(async (tx) => {
//         await tx.execute('BEGIN');
//         // Creates 100,000 Users
//         for (let i = 0; i < numberOfUsers; i++) {
//           await tx.execute('INSERT INTO User (id, name, age, networth) VALUES(?, ?, ?, ?)', [i, 'steven', i, 0]);
//         }
//         await tx.execute('COMMIT');
//       });

//       const resolved = await Promise.all(readerPromises);
//       // The query result length for 1 item should be returned for all connections
//       expect(resolved).to.deep.equal(readerPromises.map(() => numberOfUsers));
//     });

//     it('Should attach DBs', async () => {
//       const singleConnection = open('single_connection', {
//         numReadConnections: 0
//       });
//       await singleConnection.execute('DROP TABLE IF EXISTS Places; ');
//       await singleConnection.execute('CREATE TABLE Places ( id INT PRIMARY KEY, name TEXT NOT NULL) STRICT;');
//       await singleConnection.execute('INSERT INTO "Places" (id, name) VALUES(0, "Beverly Hills")');
//       singleConnection.close();

//       db.attach('single_connection', 'another');

//       const result = await db.execute('SELECT * from another.Places');

//       db.detach('another');
//       QuickSQLite.delete('single_connection');

//       expect(result.rows?.length).to.equal(1);
//     });

//     it('10000 INSERTs', async () => {
//       let start = performance.now();
//       for (let i = 0; i < 1000; ++i) {
//         const n = randomIntFromInterval(0, 100000);
//         await db.execute(`INSERT INTO t1(a, b, c) VALUES(?, ?, ?)`, [i + 1, n, numberName(n)]);
//       }
//       await db.execute('PRAGMA wal_checkpoint(RESTART)');
//       let end = performance.now();
//       let duration = end - start;

//       expect(duration).lessThan(2000);
//     });
//   });
// }
