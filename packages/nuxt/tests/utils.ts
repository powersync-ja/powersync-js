import type { App } from 'vue';
import { createApp } from 'vue';
import { Schema, Table, column, type AbstractPowerSyncDatabase, type PowerSyncBackendConnector, type PowerSyncCredentials } from '@powersync/web';
import { onTestFinished } from 'vitest';
import { createPowerSyncPlugin } from '@powersync/vue';
import { NuxtPowerSyncDatabase } from '../src/runtime/utils/NuxtPowerSyncDatabase';
import { setUseDiagnostics } from './mocks/nuxt-app';

// Note: #app is mocked via vitest.config.ts alias to tests/mocks/nuxt-app.ts

export function withSetup<T>(composable: () => T, provide?: (app: App) => void): [T, App] {
  let result: T;
  const app = createApp({
    setup() {
      provide?.(app);
      result = composable();
      return () => {};
    }
  });
  app.mount(document.createElement('div'));
  return [result!, app];
}

/**
 * Creates a mock PowerSync connector for testing
 */
export const createMockConnector = (): PowerSyncBackendConnector => {
  return {
    async fetchCredentials(): Promise<PowerSyncCredentials | null> {
      return {
        endpoint: 'https://test.powersync.com',
        token: 'test-token'
      };
    },
    async uploadData(_database: AbstractPowerSyncDatabase): Promise<void> {
      // Mock upload - do nothing
    }
  };
};

/**
 * Creates a NuxtPowerSyncDatabase with diagnostics enabled or disabled
 */
export const openPowerSync = (useDiagnostics: boolean = false) => {
  // Set diagnostics flag in mock before creating database
  setUseDiagnostics(useDiagnostics);

  const db = new NuxtPowerSyncDatabase({
    database: { dbFilename: `test-${useDiagnostics ? 'diagnostics' : 'normal'}.db` },
    schema: new Schema({
      lists: new Table({
        name: column.text
      })
    })
  });

  onTestFinished(async () => {
    await db.disconnectAndClear();
    await db.close();
    // Reset diagnostics flag after test
    setUseDiagnostics(false);
  });

  return db;
};

export const withPowerSyncSetup = <Result>(
  callback: () => Result,
  powersync: AbstractPowerSyncDatabase
) => {
  return withSetup(callback, (app) => {
    const { install } = createPowerSyncPlugin({ database: powersync });
    install(app);
  });
};

// Re-export setUseDiagnostics for convenience
export { setUseDiagnostics } from './mocks/nuxt-app';
