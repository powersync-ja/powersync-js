import { Schema, Table, column } from '@powersync/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePowerSyncKysely } from '../../src/runtime/composables/usePowerSyncKysely';
import { withPowerSyncSetup, openPowerSync } from '../utils';

// Note: #app is mocked via vitest.config.ts alias to tests/mocks/nuxt-app.ts
// Using real @powersync/kysely-driver - no mocks

interface TestDatabase {
  lists: {
    id: string;
    name: string;
  };
}

describe('usePowerSyncKysely', () => {
  let powersync: ReturnType<typeof openPowerSync>;

  beforeEach(() => {
    powersync = openPowerSync();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should execute real queries: insert data and query it back', async () => {
    const [db] = withPowerSyncSetup(() => usePowerSyncKysely<TestDatabase>(), powersync);
    
    // Insert data using Kysely
    await db
      .insertInto('lists')
      .values({ id: 'test-id-1', name: 'Test List 1' })
      .execute();
    
    // Query it back
    const results = await db
      .selectFrom('lists')
      .selectAll()
      .execute();
    
    expect(results.length).toBeGreaterThan(0);
    const insertedItem = results.find(item => item.id === 'test-id-1');
    expect(insertedItem).toBeDefined();
    expect(insertedItem?.name).toBe('Test List 1');
  });

  it('should support query chaining with selectFrom -> selectAll -> execute', async () => {
    const [db] = withPowerSyncSetup(() => usePowerSyncKysely<TestDatabase>(), powersync);
    
    // Insert test data
    await db
      .insertInto('lists')
      .values([
        { id: 'test-id-2', name: 'List 2' },
        { id: 'test-id-3', name: 'List 3' }
      ])
      .execute();
    
    // Chain query methods
    const results = await db
      .selectFrom('lists')
      .selectAll()
      .execute();
    
    expect(results.length).toBeGreaterThanOrEqual(2);
    const list2 = results.find(item => item.id === 'test-id-2');
    const list3 = results.find(item => item.id === 'test-id-3');
    expect(list2).toBeDefined();
    expect(list3).toBeDefined();
  });

  it('should support update queries', async () => {
    const [db] = withPowerSyncSetup(() => usePowerSyncKysely<TestDatabase>(), powersync);
    
    // Insert data
    await db
      .insertInto('lists')
      .values({ id: 'test-id-4', name: 'Original Name' })
      .execute();
    
    // Update it
    await db
      .updateTable('lists')
      .set({ name: 'Updated Name' })
      .where('id', '=', 'test-id-4')
      .execute();
    
    // Verify update
    const results = await db
      .selectFrom('lists')
      .selectAll()
      .where('id', '=', 'test-id-4')
      .execute();
    
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Updated Name');
  });

  it('should support delete queries', async () => {
    const [db] = withPowerSyncSetup(() => usePowerSyncKysely<TestDatabase>(), powersync);
    
    // Insert data
    await db
      .insertInto('lists')
      .values({ id: 'test-id-5', name: 'To Delete' })
      .execute();
    
    // Delete it
    await db
      .deleteFrom('lists')
      .where('id', '=', 'test-id-5')
      .execute();
    
    // Verify deletion
    const results = await db
      .selectFrom('lists')
      .selectAll()
      .where('id', '=', 'test-id-5')
      .execute();
    
    expect(results.length).toBe(0);
  });

  it('should handle errors for invalid queries', async () => {
    const [db] = withPowerSyncSetup(() => usePowerSyncKysely<TestDatabase>(), powersync);
    
    // Try to query a non-existent table
    await expect(
      db
        .selectFrom('nonexistent_table' as any)
        .selectAll()
        .execute()
    ).rejects.toThrow();
  });

  it('should work with different table schemas', async () => {
    // Create database with multiple tables
    const multiTableDb = openPowerSync();
    
    // Note: This test verifies the composable works, but the schema is defined in openPowerSync
    // In a real scenario, you'd have multiple tables in your schema
    const [db] = withPowerSyncSetup(() => usePowerSyncKysely<TestDatabase>(), multiTableDb);
    
    // Insert and query from lists table
    await db
      .insertInto('lists')
      .values({ id: 'test-id-6', name: 'Multi Table Test' })
      .execute();
    
    const results = await db
      .selectFrom('lists')
      .selectAll()
      .where('id', '=', 'test-id-6')
      .execute();
    
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Multi Table Test');
  });
});
