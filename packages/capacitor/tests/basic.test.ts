import { column, LockContext, Schema, Table } from '@powersync/web';
import { describe, expect, it, onTestFinished } from 'vitest';
import { PowerSyncDatabase } from '../src/PowerSyncDatabase.js';
import { CapacitorSQLiteAdapter } from '../src/adapter/CapacitorSQLiteAdapter.js';

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

let userCounter = 0;
function generateUserInfo() {
  userCounter += 1;
  return {
    id: `test-user-${userCounter}`,
    name: `Test User ${userCounter}`,
    age: 20 + userCounter,
    networth: 1000.5 + userCounter
  };
}

function createTestUser(context: Pick<LockContext, 'execute'>) {
  const { name, age, networth } = generateUserInfo();
  return context.execute('INSERT INTO users (id, name, age, networth) VALUES(uuid(), ?, ?, ?)', [
    name,
    age,
    networth
  ]);
}

describe('Basic tests', () => {
  function openDatabase(dbFilename: string) {
    const database = new PowerSyncDatabase({
      database: {
        dbFilename
      },
      schema: AppSchema
    });
    onTestFinished(async () => {
      await database.disconnectAndClear().catch(() => {});
      await database.close().catch(() => {});
    });
    return database;
  }

  /**
   * We test in either ios/android - so we should use CapacitorSQLiteAdapter by default.
   */
  it('should use native driver', async () => {
    const database = openDatabase('native-driver');

    expect(database.database).toBeInstanceOf(CapacitorSQLiteAdapter);
  });

  it('should insert', async () => {
    const database = openDatabase('insert');

    const res = await createTestUser(database);

    expect(res.rows?._array).toEqual([]);
    expect(res.rows?.length).toBe(0);
    expect(res.rows?.item).toBeTypeOf('function');
  });

  it('should query without params', async () => {
    const database = openDatabase('query-without-params');
    const { name, age, networth } = generateUserInfo();
    await database.execute('INSERT INTO users (id, name, age, networth) VALUES(uuid(), ?, ?, ?)', [
      name,
      age,
      networth
    ]);

    const res = await database.execute('SELECT name, age, networth FROM users');

    expect(res.rows?.length).toBe(1);
    expect(res.rows?._array).toEqual([{ name, age, networth }]);
  });

  it('should query with params', async () => {
    const database = openDatabase('query-with-params');
    const { id, name, age, networth } = generateUserInfo();
    await database.execute('INSERT INTO users (id, name, age, networth) VALUES(?, ?, ?, ?)', [
      id,
      name,
      age,
      networth
    ]);

    const res = await database.execute('SELECT name, age, networth FROM users WHERE id = ?', [id]);

    expect(res.rows?._array).toEqual([{ name, age, networth }]);
  });

  it('should reject failed inserts', async () => {
    const database = openDatabase('failed-insert');
    const { name, networth } = generateUserInfo();

    await expect(
      database.execute('INSERT INTO usersfail (id, name, age, networth) VALUES(uuid(), ?, ?, ?)', [
        name,
        name,
        networth
      ])
    ).rejects.toThrow(/no such table/i);
  });

  it('should auto commit transactions', async () => {
    const database = openDatabase('transaction-auto-commit');
    const { name, age, networth } = generateUserInfo();

    await database.writeTransaction(async (tx) => {
      const res = await tx.execute('INSERT INTO "users" (id, name, age, networth) VALUES(uuid(), ?, ?, ?)', [
        name,
        age,
        networth
      ]);

      expect(res.rows?._array).toEqual([]);
      expect(res.rows?.length).toBe(0);
      expect(res.rows?.item).toBeTypeOf('function');
    });

    const res = await database.execute('SELECT name, age, networth FROM users');
    expect(res.rows?._array).toEqual([{ name, age, networth }]);
  });

  it('should auto rollback transactions on error', async () => {
    const database = openDatabase('transaction-auto-rollback');
    const { name, age, networth } = generateUserInfo();

    await expect(
      database.writeTransaction(async (tx) => {
        await tx.execute('INSERT INTO "users" (id, name, age, networth) VALUES(uuid(), ?, ?, ?)', [
          name,
          age,
          networth
        ]);
        throw new Error('rollback sentinel');
      })
    ).rejects.toThrow('rollback sentinel');

    const res = await database.execute('SELECT * FROM users');
    expect(res.rows?._array).toEqual([]);
  });

  it('should manually commit transactions', async () => {
    const database = openDatabase('transaction-manual-commit');
    const { name, age, networth } = generateUserInfo();

    await database.writeTransaction(async (tx) => {
      await tx.execute('INSERT INTO "users" (id, name, age, networth) VALUES(uuid(), ?, ?, ?)', [
        name,
        age,
        networth
      ]);
      await tx.commit();
    });

    const res = await database.execute('SELECT name, age, networth FROM users');
    expect(res.rows?._array).toEqual([{ name, age, networth }]);
  });

  it('should manually rollback transactions', async () => {
    const database = openDatabase('transaction-manual-rollback');
    const { name, age, networth } = generateUserInfo();

    await database.writeTransaction(async (tx) => {
      await tx.execute('INSERT INTO "users" (id, name, age, networth) VALUES(uuid(), ?, ?, ?)', [
        name,
        age,
        networth
      ]);
      await tx.rollback();
    });

    const res = await database.execute('SELECT * FROM users');
    expect(res.rows?._array).toEqual([]);
  });

  it('should reject writeLock callback errors', async () => {
    const database = openDatabase('write-lock-callback-error');

    await expect(
      database.writeLock(async () => {
        throw new Error('Error from callback');
      })
    ).rejects.toThrow('Error from callback');
  });

  it('should reject transaction callback errors', async () => {
    const database = openDatabase('transaction-callback-error');

    await expect(
      database.writeTransaction(async () => {
        throw new Error('Error from callback');
      })
    ).rejects.toThrow('Error from callback');
  });

  it('should reject invalid transaction queries', async () => {
    const database = openDatabase('transaction-invalid-query');

    await expect(
      database.writeTransaction(async (tx) => {
        await tx.execute('SELECT * FROM [tableThatDoesNotExist];');
      })
    ).rejects.toThrow(/no such table: tableThatDoesNotExist/i);
  });

  it('should batch execute', async () => {
    const database = openDatabase('batch-execute');
    const { id: id1, name: name1, age: age1, networth: networth1 } = generateUserInfo();
    const { id: id2, name: name2, age: age2, networth: networth2 } = generateUserInfo();

    await database.executeBatch('INSERT INTO "users" (id, name, age, networth) VALUES(?, ?, ?, ?)', [
      [id1, name1, age1, networth1],
      [id2, name2, age2, networth2]
    ]);

    const expected = [
      { id: id1, name: name1, age: age1, networth: networth1 },
      { id: id2, name: name2, age: age2, networth: networth2 }
    ].sort((a, b) => a.name.localeCompare(b.name));

    const res = await database.execute('SELECT id, name, age, networth FROM users ORDER BY name');
    expect(res.rows?._array).toEqual(expected);
  });

  it('should keep read locks read only', async () => {
    const database = openDatabase('read-lock-read-only');
    const { id, name, age, networth } = generateUserInfo();

    await expect(
      database.readLock(async (context) => {
        await context.execute('INSERT INTO "users" (id, name, age, networth) VALUES(?, ?, ?, ?)', [
          id,
          name,
          age,
          networth
        ]);
      })
    ).rejects.toThrow(/readonly|read.?only|not an error/i);
  });

  /**
   * The native driver should allow for concurrent writes/reads.
   */
  it('should read while a writeLock is held', async () => {
    const database = openDatabase('read-while-write-lock');

    let releaseWriteLock!: () => void;
    const writeLockRelease = new Promise<void>((resolve) => {
      releaseWriteLock = resolve;
    });

    let writeLockStarted!: () => void;
    const writeLockStart = new Promise<void>((resolve) => {
      writeLockStarted = resolve;
    });

    const writeLock = database.writeLock(async () => {
      writeLockStarted();
      await writeLockRelease;
    });

    await writeLockStart;

    const result = await Promise.race([
      database.readLock(async (context) => {
        const row = await context.get<{ value: number }>('SELECT 42 AS value');
        releaseWriteLock();
        return row.value;
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timed out waiting for readLock while writeLock was held')), 2_000);
      })
    ]);

    expect(result).toBe(42);
    await writeLock;
  });
});
