import { AbstractPowerSyncDatabase } from '@powersync/common';
import { Kysely, sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as SUT from '../src/index.js';
import { getPowerSyncDb } from './setup/db.js';
import { Database } from './setup/types.js';

describe('package exports', () => {
  let powerSyncDb: AbstractPowerSyncDatabase;

  beforeEach(() => {
    powerSyncDb = getPowerSyncDb();
  });

  afterEach(async () => {
    await powerSyncDb.disconnectAndClear();
  });

  it('exports the database, dialect and driver classes as values', () => {
    expect(SUT.PowerSyncKyselyDatabase).toBeTypeOf('function');
    expect(SUT.PowerSyncDialect).toBeTypeOf('function');
    expect(SUT.PowerSyncDriver).toBeTypeOf('function');
  });

  it('lets an app extend the database class', async () => {
    class AppDatabase extends SUT.PowerSyncKyselyDatabase<Database> {
      countUsers() {
        return this.selectFrom('users')
          .select(sql<number>`count(*)`.as('count'))
          .executeTakeFirstOrThrow();
      }
    }

    const db = new AppDatabase(powerSyncDb);
    await db.insertInto('users').values({ id: '1', name: 'one' }).execute();
    expect((await db.countUsers()).count).toBe(1);
  });

  it('lets an app build its own Kysely instance on the dialect', async () => {
    const db = new Kysely<Database>({ dialect: new SUT.PowerSyncDialect({ db: powerSyncDb }) });
    await db.insertInto('users').values({ id: '1', name: 'one' }).execute();
    expect(await db.selectFrom('users').select('name').execute()).toEqual([{ name: 'one' }]);
  });
});
