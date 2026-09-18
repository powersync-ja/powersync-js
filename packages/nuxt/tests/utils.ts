import type { App } from 'vue';
import { createApp } from 'vue';
import {
  PowerSyncDatabase,
  Schema,
  Table,
  column,
  type AbstractPowerSyncDatabase,
  type PowerSyncBackendConnector,
  type PowerSyncCredentials
} from '@powersync/web';
import { onTestFinished } from 'vitest';
import { createPowerSyncPlugin } from '@powersync/vue';

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
 * Opens a PowerSync database for a test and closes it when the test finishes.
 */
export const openPowerSync = () => {
  const db = new PowerSyncDatabase({
    database: { dbFilename: 'test.db' },
    schema: new Schema({
      lists: new Table({
        name: column.text
      })
    })
  });

  onTestFinished(async () => {
    await db.disconnectAndClear();
    await db.close();
  });

  return db;
};

export const withPowerSyncSetup = <Result>(callback: () => Result, powersync: AbstractPowerSyncDatabase) => {
  return withSetup(callback, (app) => {
    const { install } = createPowerSyncPlugin({ database: powersync });
    install(app);
  });
};
