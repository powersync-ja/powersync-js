import { Kysely, SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler } from 'kysely';
import * as SUT from '../../src/sqlite/sqlite-dialect';
import { describe, it, expect, vitest } from 'vitest';
import { PowerSyncDriver } from '../../src/sqlite/sqlite-driver';
import { AbstractPowerSyncDatabase } from '@powersync/web';

describe('PowerSyncDialect', () => {
  const config = { db: {} as AbstractPowerSyncDatabase };
  const dialect = new SUT.PowerSyncDialect(config);

  it('should create a driver', () => {
    const driver = dialect.createDriver();
    expect(driver).toBeInstanceOf(PowerSyncDriver);
  });

  it('should create a query compiler', () => {
    const queryCompiler = dialect.createQueryCompiler();
    expect(queryCompiler).toBeInstanceOf(SqliteQueryCompiler);
  });

  it('should create an adapter', () => {
    const adapter = dialect.createAdapter();
    expect(adapter).toBeInstanceOf(SqliteAdapter);
  });

  it('should create an introspector', () => {
    const db = new Kysely({
      dialect: {
        createQueryCompiler: vitest.fn(),
        createDriver: vitest.fn(),
        createAdapter: vitest.fn(),
        createIntrospector: vitest.fn()
      }
    });
    const introspector = dialect.createIntrospector(db);
    expect(introspector).toBeInstanceOf(SqliteIntrospector);
  });
});
