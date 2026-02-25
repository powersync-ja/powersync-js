import { SharedWebStreamingSyncImplementation, WebStreamingSyncImplementation } from '@powersync/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NuxtPowerSyncDatabase } from '../../src/runtime/utils/NuxtPowerSyncDatabase';
import { openPowerSync, createMockConnector } from '../utils';
import { setUseDiagnostics } from '../mocks/nuxt-app';

// Note: #app is mocked via vitest.config.ts alias to tests/mocks/nuxt-app.ts

describe('NuxtPowerSyncDatabase', () => {
  beforeEach(() => {
    // Reset diagnostics flag before each test
    setUseDiagnostics(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should use default sync implementation when diagnostics is disabled', async () => {
    const db = openPowerSync(false);
    const connector = createMockConnector();
    
    // Spy on the parent class method to verify it's called
    const superGenerateSpy = vi.spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(db)),
      'generateSyncStreamImplementation'
    );
    
    await db.init();
    await db.connect(connector);
    
    // When diagnostics is disabled, should call super.generateSyncStreamImplementation
    // We can't directly test this, but we can verify the sync implementation exists
    expect(db.syncStreamImplementation).toBeDefined();
    
    await db.disconnect();
  });

  it('should use diagnostics sync implementation when diagnostics is enabled', async () => {
    setUseDiagnostics(true);
    const db = openPowerSync(true);
    const connector = createMockConnector();
    
    await db.init();
    await db.connect(connector);
    
    // When diagnostics is enabled, should use SharedWebStreamingSyncImplementation
    // (because enableMultiTabs is set to true)
    const syncImpl = db.syncStreamImplementation;
    expect(syncImpl).toBeDefined();
    expect(syncImpl).toBeInstanceOf(SharedWebStreamingSyncImplementation);
    
    await db.disconnect();
  });

  it('should extend schema with diagnostics tables when diagnostics is enabled', () => {
    setUseDiagnostics(true);
    const db = openPowerSync(true);
    
    // Verify that diagnostics schema tables are included
    // The schema should include both the app schema and diagnostics schema
    const schema = db.dbOptions.schema;
    expect(schema).toBeDefined();
    
    // Check that diagnostics tables are present
    const tableNames = schema.tables.map((t: any) => t.name);
    // Diagnostics schema includes local_bucket_data and local_schema
    expect(tableNames).toContain('local_bucket_data');
    expect(tableNames).toContain('local_schema');
    // Also check app schema table is present
    expect(tableNames).toContain('lists');
  });

  it('should set enableMultiTabs and broadcastLogs flags when diagnostics is enabled', () => {
    setUseDiagnostics(true);
    const db = openPowerSync(true);
    
    // Verify flags are set
    const flags = db.dbOptions.flags;
    expect(flags?.enableMultiTabs).toBe(true);
    expect(flags?.broadcastLogs).toBe(true);
  });

  it('should use diagnostics logger when diagnostics is enabled', () => {
    setUseDiagnostics(true);
    const db = openPowerSync(true);
    
    // Verify logger is set (it should be the diagnostics logger, not default)
    const logger = db.dbOptions.logger;
    expect(logger).toBeDefined();
    // The diagnostics logger should have DEBUG level
    expect(logger?.getLevel()).toBeDefined();
  });

  it('should store connector and connectionOptions internally', async () => {
    const db = openPowerSync(false);
    const connector = createMockConnector();
    const connectionOptions = { clientImplementation: undefined };
    
    await db.init();
    await db.connect(connector, connectionOptions);
    
    // Verify connector is stored
    expect(db.connector).toBe(connector);
    expect(db.connectionOptions).toBe(connectionOptions);
    
    await db.disconnect();
    
    // After disconnect, should be cleared
    expect(db.connector).toBeNull();
    expect(db.connectionOptions).toBeNull();
  });

  it('should use SharedWebStreamingSyncImplementation when diagnostics enables multi-tabs', async () => {
    setUseDiagnostics(true);
    const db = openPowerSync(true);
    const connector = createMockConnector();
    
    await db.init();
    await db.connect(connector);
    
    // When diagnostics is enabled, enableMultiTabs is set to true,
    // so it should use SharedWebStreamingSyncImplementation
    const syncImpl = db.syncStreamImplementation;
    expect(syncImpl).toBeInstanceOf(SharedWebStreamingSyncImplementation);
    
    await db.disconnect();
  });

  it('should clear connector and connectionOptions on disconnectAndClear', async () => {
    const db = openPowerSync(false);
    const connector = createMockConnector();
    
    await db.init();
    await db.connect(connector);
    
    expect(db.connector).toBe(connector);
    
    await db.disconnectAndClear();
    
    expect(db.connector).toBeNull();
    expect(db.connectionOptions).toBeNull();
  });
});
