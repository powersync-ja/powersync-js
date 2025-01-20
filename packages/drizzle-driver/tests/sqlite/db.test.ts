import { AbstractPowerSyncDatabase } from '@powersync/common';
import { eq, sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as SUT from '../../src/sqlite/PowerSyncSQLiteDatabase';
import { DrizzleSchema, drizzleUsers, getDrizzleDb, getPowerSyncDb } from '../setup/db';

describe('Database operations', () => {
  let powerSyncDb: AbstractPowerSyncDatabase;
  let db: SUT.PowerSyncSQLiteDatabase<typeof DrizzleSchema>;

  beforeEach(() => {
    powerSyncDb = getPowerSyncDb();
    db = getDrizzleDb(powerSyncDb);
  });

  afterEach(async () => {
    await powerSyncDb.disconnectAndClear();
  });

  it('should insert a user and select that user', async () => {
    await db.insert(drizzleUsers).values({ id: '1', name: 'John' });
    const result = await db.select().from(drizzleUsers);

    expect(result.length).toEqual(1);
  });

  it('should insert a user and delete that user', async () => {
    await db.insert(drizzleUsers).values({ id: '2', name: 'Ben' });
    await db.delete(drizzleUsers).where(eq(drizzleUsers.name, 'Ben'));
    const result = await db.select().from(drizzleUsers);

    expect(result.length).toEqual(0);
  });

  it('should insert a user and update that user', async () => {
    await db.insert(drizzleUsers).values({ id: '3', name: 'Lucy' });
    await db.update(drizzleUsers).set({ name: 'Lucy Smith' }).where(eq(drizzleUsers.name, 'Lucy'));
    const result = await db.select().from(drizzleUsers).get();

    expect(result!.name).toEqual('Lucy Smith');
  });

  it('should insert a user and update that user within a transaction', async () => {
    await db.transaction(async (transaction) => {
      await transaction.insert(drizzleUsers).values({ id: '4', name: 'James' });
      await transaction.update(drizzleUsers).set({ name: 'James Smith' }).where(eq(drizzleUsers.name, 'James'));
    });
    const result = await db.select().from(drizzleUsers).get();

    expect(result!.name).toEqual('James Smith');
  });

  it('should insert a user and update that user within a transaction when raw sql is used', async () => {
    await db.transaction(async (transaction) => {
      await transaction.run(sql`INSERT INTO users (id, name) VALUES ('4', 'James');`);
      await transaction.update(drizzleUsers).set({ name: 'James Smith' }).where(eq(drizzleUsers.name, 'James'));
    });

    const result = await db.select().from(drizzleUsers).get();

    expect(result!.name).toEqual('James Smith');
  });
});
