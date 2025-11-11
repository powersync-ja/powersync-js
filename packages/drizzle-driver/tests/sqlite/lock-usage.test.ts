import { eq, sql } from 'drizzle-orm';
import { describe, expect, test, vi } from 'vitest';
import { toCompilableQuery } from '../../src/utils/compilableQuery.js';
import { drizzleUsers, getDrizzleDb, getPowerSyncDb } from '../setup/db.js';

type TestContext = {
  powerSyncDb: ReturnType<typeof getPowerSyncDb>;
  readLockSpy: ReturnType<typeof vi.spyOn>;
  writeLockSpy: ReturnType<typeof vi.spyOn>;
  db: ReturnType<typeof getDrizzleDb>;
};

export const lockUsageTest = test.extend<TestContext>({
  powerSyncDb: async ({}, use) => {
    const powerSyncDb = getPowerSyncDb();
    await use(powerSyncDb);
    await powerSyncDb.disconnectAndClear();
  },
  readLockSpy: async ({ powerSyncDb }, use) => {
    const readLockSpy = vi.spyOn(powerSyncDb, 'readLock' as any) as any;
    readLockSpy.mockClear();
    await use(readLockSpy);
    readLockSpy.mockRestore();
  },
  writeLockSpy: async ({ powerSyncDb }, use) => {
    const writeLockSpy = vi.spyOn(powerSyncDb, 'writeLock' as any) as any;
    writeLockSpy.mockClear();
    await use(writeLockSpy);
    writeLockSpy.mockRestore();
  },
  db: async ({ powerSyncDb, readLockSpy, writeLockSpy }, use) => {
    const db = getDrizzleDb(powerSyncDb);
    // Insert initial test data (Alice) and clear spies after setup
    await db.insert(drizzleUsers).values({ id: '1', name: 'Alice' });
    readLockSpy.mockClear();
    writeLockSpy.mockClear();
    await use(db);
  }
});

describe('Lock Usage Tests', () => {
  describe('SELECT queries', () => {
    lockUsageTest('should use readLock for select().from()', async ({ db, readLockSpy, writeLockSpy }) => {
      await db.select().from(drizzleUsers);

      expect(readLockSpy).toHaveBeenCalled();
      expect(writeLockSpy).not.toHaveBeenCalled();
    });

    lockUsageTest('should use readLock for select().from().get()', async ({ db, readLockSpy, writeLockSpy }) => {
      await db.select().from(drizzleUsers).get();

      expect(readLockSpy).toHaveBeenCalled();
      expect(writeLockSpy).not.toHaveBeenCalled();
    });

    lockUsageTest('should use readLock for select().from().all()', async ({ db, readLockSpy, writeLockSpy }) => {
      await db.select().from(drizzleUsers).all();

      expect(readLockSpy).toHaveBeenCalled();
      expect(writeLockSpy).not.toHaveBeenCalled();
    });

    lockUsageTest('should use readLock for select with where clause', async ({ db, readLockSpy, writeLockSpy }) => {
      await db.select().from(drizzleUsers).where(eq(drizzleUsers.id, '1'));

      expect(readLockSpy).toHaveBeenCalled();
      expect(writeLockSpy).not.toHaveBeenCalled();
    });

    lockUsageTest('should use readLock for select with limit', async ({ db, readLockSpy, writeLockSpy }) => {
      await db.select().from(drizzleUsers).limit(1);

      expect(readLockSpy).toHaveBeenCalled();
      expect(writeLockSpy).not.toHaveBeenCalled();
    });

    lockUsageTest('should use readLock for select with orderBy', async ({ db, readLockSpy, writeLockSpy }) => {
      await db.select().from(drizzleUsers).orderBy(drizzleUsers.name);

      expect(readLockSpy).toHaveBeenCalled();
      expect(writeLockSpy).not.toHaveBeenCalled();
    });
  });

  describe('INSERT queries', () => {
    lockUsageTest('should use writeLock for insert().values()', async ({ db, readLockSpy, writeLockSpy }) => {
      await db.insert(drizzleUsers).values({ id: '2', name: 'Bob' });

      expect(writeLockSpy).toHaveBeenCalled();
      expect(readLockSpy).not.toHaveBeenCalled();
    });

    lockUsageTest(
      'should use writeLock for insert().values() with multiple rows',
      async ({ db, readLockSpy, writeLockSpy }) => {
        await db.insert(drizzleUsers).values([
          { id: '2', name: 'Bob' },
          { id: '3', name: 'Charlie' }
        ]);

        expect(writeLockSpy).toHaveBeenCalled();
        expect(readLockSpy).not.toHaveBeenCalled();
      }
    );

    lockUsageTest(
      'should use writeLock for insert().values().returning()',
      async ({ db, readLockSpy, writeLockSpy }) => {
        const result = await db.insert(drizzleUsers).values({ id: '2', name: 'Bob' }).returning();

        expect(writeLockSpy).toHaveBeenCalled();
        expect(readLockSpy).not.toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ id: '2', name: 'Bob' });
      }
    );

    lockUsageTest(
      'should use writeLock for insert().values().returning() with specific columns',
      async ({ db, readLockSpy, writeLockSpy }) => {
        const result = await db
          .insert(drizzleUsers)
          .values({ id: '2', name: 'Bob' })
          .returning({ id: drizzleUsers.id, name: drizzleUsers.name });

        expect(writeLockSpy).toHaveBeenCalled();
        expect(readLockSpy).not.toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ id: '2', name: 'Bob' });
      }
    );

    lockUsageTest(
      'should use writeLock for insert().values() with multiple rows and returning()',
      async ({ db, readLockSpy, writeLockSpy }) => {
        const result = await db
          .insert(drizzleUsers)
          .values([
            { id: '2', name: 'Bob' },
            { id: '3', name: 'Charlie' }
          ])
          .returning();

        expect(writeLockSpy).toHaveBeenCalled();
        expect(readLockSpy).not.toHaveBeenCalled();
        expect(result).toHaveLength(2);
        expect(result).toEqual([
          { id: '2', name: 'Bob' },
          { id: '3', name: 'Charlie' }
        ]);
      }
    );
  });

  describe('UPDATE queries', () => {
    lockUsageTest('should use writeLock for update().set()', async ({ db, readLockSpy, writeLockSpy }) => {
      await db.update(drizzleUsers).set({ name: 'Alice Smith' });

      expect(writeLockSpy).toHaveBeenCalled();
      expect(readLockSpy).not.toHaveBeenCalled();
    });

    lockUsageTest('should use writeLock for update().set().where()', async ({ db, readLockSpy, writeLockSpy }) => {
      await db.update(drizzleUsers).set({ name: 'Alice Smith' }).where(eq(drizzleUsers.id, '1'));

      expect(writeLockSpy).toHaveBeenCalled();
      expect(readLockSpy).not.toHaveBeenCalled();
    });

    lockUsageTest('should use writeLock for update().set().returning()', async ({ db, readLockSpy, writeLockSpy }) => {
      const result = await db
        .update(drizzleUsers)
        .set({ name: 'Alice Smith' })
        .where(eq(drizzleUsers.id, '1'))
        .returning();

      expect(writeLockSpy).toHaveBeenCalled();
      expect(readLockSpy).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: '1', name: 'Alice Smith' });
    });

    lockUsageTest(
      'should use writeLock for update().set().returning() with specific columns',
      async ({ db, readLockSpy, writeLockSpy }) => {
        const result = await db
          .update(drizzleUsers)
          .set({ name: 'Alice Smith' })
          .where(eq(drizzleUsers.id, '1'))
          .returning({ id: drizzleUsers.id, name: drizzleUsers.name });

        expect(writeLockSpy).toHaveBeenCalled();
        expect(readLockSpy).not.toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ id: '1', name: 'Alice Smith' });
      }
    );
  });

  describe('DELETE queries', () => {
    lockUsageTest('should use writeLock for delete().from()', async ({ db, readLockSpy, writeLockSpy }) => {
      await db.delete(drizzleUsers);

      expect(writeLockSpy).toHaveBeenCalled();
      expect(readLockSpy).not.toHaveBeenCalled();
    });

    lockUsageTest('should use writeLock for delete().from().where()', async ({ db, readLockSpy, writeLockSpy }) => {
      await db.delete(drizzleUsers).where(eq(drizzleUsers.id, '1'));

      expect(writeLockSpy).toHaveBeenCalled();
      expect(readLockSpy).not.toHaveBeenCalled();
    });

    lockUsageTest('should use writeLock for delete().returning()', async ({ db, readLockSpy, writeLockSpy }) => {
      const result = await db.delete(drizzleUsers).where(eq(drizzleUsers.id, '1')).returning();

      expect(writeLockSpy).toHaveBeenCalled();
      expect(readLockSpy).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: '1', name: 'Alice' });
    });

    lockUsageTest(
      'should use writeLock for delete().returning() with specific columns',
      async ({ db, readLockSpy, writeLockSpy }) => {
        const result = await db
          .delete(drizzleUsers)
          .where(eq(drizzleUsers.id, '1'))
          .returning({ id: drizzleUsers.id, name: drizzleUsers.name });

        expect(writeLockSpy).toHaveBeenCalled();
        expect(readLockSpy).not.toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ id: '1', name: 'Alice' });
      }
    );
  });

  describe('Raw SQL queries', () => {
    lockUsageTest(
      'should use writeLock for raw SELECT queries via run()',
      async ({ db, readLockSpy, writeLockSpy }) => {
        await db.run(sql`
          SELECT
            *
          FROM
            users
        `);

        // run() always uses writeLock since it can execute any SQL statement
        expect(writeLockSpy).toHaveBeenCalled();
        expect(readLockSpy).not.toHaveBeenCalled();
      }
    );

    lockUsageTest('should use writeLock for raw INSERT queries', async ({ db, readLockSpy, writeLockSpy }) => {
      await db.run(sql`
        INSERT INTO
          users (id, name)
        VALUES
          ('2', 'Bob')
      `);

      expect(writeLockSpy).toHaveBeenCalled();
      expect(readLockSpy).not.toHaveBeenCalled();
    });

    lockUsageTest('should use writeLock for raw UPDATE queries', async ({ db, readLockSpy, writeLockSpy }) => {
      await db.run(sql`
        UPDATE users
        SET
          name = 'Alice Smith'
        WHERE
          id = '1'
      `);

      expect(writeLockSpy).toHaveBeenCalled();
      expect(readLockSpy).not.toHaveBeenCalled();
    });

    lockUsageTest('should use writeLock for raw DELETE queries', async ({ db, readLockSpy, writeLockSpy }) => {
      await db.run(sql`
        DELETE FROM users
        WHERE
          id = '1'
      `);

      expect(writeLockSpy).toHaveBeenCalled();
      expect(readLockSpy).not.toHaveBeenCalled();
    });
  });

  describe('Complex query patterns', () => {
    lockUsageTest('should use readLock for select with groupBy', async ({ db, readLockSpy, writeLockSpy }) => {
      await db.select().from(drizzleUsers).groupBy(drizzleUsers.name);

      expect(readLockSpy).toHaveBeenCalled();
      expect(writeLockSpy).not.toHaveBeenCalled();
    });

    lockUsageTest('should use readLock for select with having', async ({ db, readLockSpy, writeLockSpy }) => {
      // Add more test data for meaningful having clause
      await db.insert(drizzleUsers).values({ id: '2', name: 'Alice' });
      await db.insert(drizzleUsers).values({ id: '3', name: 'Bob' });
      readLockSpy.mockClear();
      writeLockSpy.mockClear();

      // Use having with count aggregate
      await db
        .select({ name: drizzleUsers.name, count: sql<number>`count(*)`.as('count') })
        .from(drizzleUsers)
        .groupBy(drizzleUsers.name)
        .having(sql`count(*) > 1`);

      expect(readLockSpy).toHaveBeenCalled();
      expect(writeLockSpy).not.toHaveBeenCalled();
    });
  });

  describe('Multiple operations', () => {
    lockUsageTest(
      'should use writeLock for insert, then readLock for select',
      async ({ db, readLockSpy, writeLockSpy }) => {
        await db.insert(drizzleUsers).values({ id: '2', name: 'Bob' });
        expect(writeLockSpy).toHaveBeenCalledTimes(1);
        expect(readLockSpy).not.toHaveBeenCalled();

        readLockSpy.mockClear();
        writeLockSpy.mockClear();

        await db.select().from(drizzleUsers);
        expect(readLockSpy).toHaveBeenCalledTimes(1);
        expect(writeLockSpy).not.toHaveBeenCalled();
      }
    );

    lockUsageTest(
      'should use writeLock for each write operation separately',
      async ({ db, readLockSpy, writeLockSpy }) => {
        await db.insert(drizzleUsers).values({ id: '2', name: 'Bob' });
        await db.insert(drizzleUsers).values({ id: '3', name: 'Charlie' });
        await db.update(drizzleUsers).set({ name: 'Alice Updated' }).where(eq(drizzleUsers.id, '1'));

        expect(writeLockSpy).toHaveBeenCalledTimes(3);
        expect(readLockSpy).not.toHaveBeenCalled();
      }
    );

    lockUsageTest(
      'should use readLock for each read operation separately',
      async ({ db, readLockSpy, writeLockSpy }) => {
        await db.select().from(drizzleUsers);
        await db.select().from(drizzleUsers).get();
        await db.select().from(drizzleUsers).where(eq(drizzleUsers.id, '1'));

        expect(readLockSpy).toHaveBeenCalledTimes(3);
        expect(writeLockSpy).not.toHaveBeenCalled();
      }
    );
  });

  describe('Transaction operations', () => {
    lockUsageTest(
      'should use writeLock for read-write transaction (default)',
      async ({ db, readLockSpy, writeLockSpy }) => {
        await db.transaction(async (tx) => {
          await tx.insert(drizzleUsers).values({ id: '2', name: 'Bob' });
        });

        expect(writeLockSpy).toHaveBeenCalled();
        expect(readLockSpy).not.toHaveBeenCalled();
      }
    );

    lockUsageTest(
      'should use writeLock for explicit read-write transaction',
      async ({ db, readLockSpy, writeLockSpy }) => {
        await db.transaction(
          async (tx) => {
            await tx.insert(drizzleUsers).values({ id: '2', name: 'Bob' });
          },
          { accessMode: 'read write' }
        );

        expect(writeLockSpy).toHaveBeenCalled();
        expect(readLockSpy).not.toHaveBeenCalled();
      }
    );

    lockUsageTest('should use readLock for read-only transaction', async ({ db, readLockSpy, writeLockSpy }) => {
      await db.transaction(
        async (tx) => {
          await tx.select().from(drizzleUsers);
        },
        { accessMode: 'read only' }
      );

      expect(readLockSpy).toHaveBeenCalled();
      expect(writeLockSpy).not.toHaveBeenCalled();
    });

    lockUsageTest(
      'should use readLock for read-only transaction with multiple reads',
      async ({ db, readLockSpy, writeLockSpy }) => {
        await db.transaction(
          async (tx) => {
            await tx.select().from(drizzleUsers);
            await tx.select().from(drizzleUsers).get();
          },
          { accessMode: 'read only' }
        );

        expect(readLockSpy).toHaveBeenCalledTimes(1); // Transaction itself uses readLock once
        expect(writeLockSpy).not.toHaveBeenCalled();
      }
    );

    lockUsageTest(
      'should use writeLock for read-write transaction with multiple operations',
      async ({ db, readLockSpy, writeLockSpy }) => {
        await db.transaction(
          async (tx) => {
            await tx.insert(drizzleUsers).values({ id: '2', name: 'Bob' });
            await tx.update(drizzleUsers).set({ name: 'Alice Updated' }).where(eq(drizzleUsers.id, '1'));
          },
          { accessMode: 'read write' }
        );

        expect(writeLockSpy).toHaveBeenCalledTimes(1); // Transaction itself uses writeLock once
        expect(readLockSpy).not.toHaveBeenCalled();
      }
    );
  });

  describe('toCompilableQuery', () => {
    lockUsageTest(
      'should use readLock when executing a compilable select query',
      async ({ db, readLockSpy, writeLockSpy }) => {
        const selectQuery = db.select().from(drizzleUsers);
        const compilableQuery = toCompilableQuery(selectQuery);

        await compilableQuery.execute();

        expect(readLockSpy).toHaveBeenCalled();
        expect(writeLockSpy).not.toHaveBeenCalled();
      }
    );

    lockUsageTest(
      'should use readLock when executing a compilable select query with where clause',
      async ({ db, readLockSpy, writeLockSpy }) => {
        const selectQuery = db.select().from(drizzleUsers).where(eq(drizzleUsers.id, '1'));
        const compilableQuery = toCompilableQuery(selectQuery);

        await compilableQuery.execute();

        expect(readLockSpy).toHaveBeenCalled();
        expect(writeLockSpy).not.toHaveBeenCalled();
      }
    );

    lockUsageTest(
      // It's probably a bad practice to perform a mutation in a watched query, but this still works
      'should use writeLock when executing a compilable insert query',
      async ({ db, readLockSpy, writeLockSpy }) => {
        const insertQuery = db.insert(drizzleUsers).values({ id: '2', name: 'Bob' });
        const compilableQuery = toCompilableQuery(insertQuery);

        await compilableQuery.execute();

        expect(writeLockSpy).toHaveBeenCalled();
        expect(readLockSpy).not.toHaveBeenCalled();
      }
    );

    lockUsageTest(
      'should use writeLock when executing a compilable update query',
      async ({ db, readLockSpy, writeLockSpy }) => {
        const updateQuery = db.update(drizzleUsers).set({ name: 'Alice Updated' }).where(eq(drizzleUsers.id, '1'));
        const compilableQuery = toCompilableQuery(updateQuery);

        await compilableQuery.execute();

        expect(writeLockSpy).toHaveBeenCalled();
        expect(readLockSpy).not.toHaveBeenCalled();
      }
    );

    lockUsageTest(
      'should use writeLock when executing a compilable delete query',
      async ({ db, readLockSpy, writeLockSpy }) => {
        const deleteQuery = db.delete(drizzleUsers).where(eq(drizzleUsers.id, '1'));
        const compilableQuery = toCompilableQuery(deleteQuery);

        await compilableQuery.execute();

        expect(writeLockSpy).toHaveBeenCalled();
        expect(readLockSpy).not.toHaveBeenCalled();
      }
    );

    lockUsageTest(
      'should use readLock when compiling and executing a select query separately',
      async ({ db, readLockSpy, writeLockSpy }) => {
        const selectQuery = db.select().from(drizzleUsers);
        const compilableQuery = toCompilableQuery(selectQuery);

        // Compile first
        const compiled = compilableQuery.compile();
        expect(compiled.sql).toContain('select');
        expect(compiled.parameters).toBeDefined();

        // Then execute
        await compilableQuery.execute();

        expect(readLockSpy).toHaveBeenCalled();
        expect(writeLockSpy).not.toHaveBeenCalled();
      }
    );
  });
});
