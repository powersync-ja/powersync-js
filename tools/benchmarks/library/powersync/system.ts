import '@azure/core-asynciterator-polyfill';

import { AbstractPowerSyncDatabase } from '@powersync/common';
import { PowerSyncDatabase as PowerSyncDatabaseNative } from '@powersync/react-native';
import { PowerSyncDatabase as PowerSyncDatabaseWeb, WASQLiteOpenFactory } from '@powersync/web';
import Logger from 'js-logger';
import React from 'react';
import { AppSchema } from './AppSchema';
import { TestConnector } from './TestConnector';
import { AppConfig } from './AppConfig';

Logger.useDefaults();
Logger.setLevel(Logger.DEBUG);

export class System {
  testConnector: TestConnector;
  powersync: AbstractPowerSyncDatabase;
  syncStart: number | undefined;
  syncEnd: number | undefined;

  constructor() {
    this.testConnector = new TestConnector();
    if (PowerSyncDatabaseNative) {
      this.powersync = new PowerSyncDatabaseNative({
        schema: AppSchema,
        crudUploadThrottleMs: 1,
        database: {
          dbFilename: 'sqlite.db'
        }
      });
    } else {
      const factory = new WASQLiteOpenFactory({
        dbFilename: 'sqlite.db',
        debugMode: true,

        // You can specify a path to the db worker
        worker: '/@powersync/worker/WASQLiteDB.umd.js'

        // Or provide a factory function to create the worker.
        // The worker name should be unique for the database filename to avoid conflicts if multiple clients with different databases are present.
        // worker: (options) => {
        //   if (options?.flags?.enableMultiTabs) {
        //     return new SharedWorker(`/@powersync/worker/WASQLiteDB.umd.js`, {
        //       name: `shared-DB-worker-${options?.dbFilename}`
        //     });
        //   } else {
        //     return new Worker(`/@powersync/worker/WASQLiteDB.umd.js`, {
        //       name: `DB-worker-${options?.dbFilename}`
        //     });
        //   }
        // }
      });
      this.powersync = new PowerSyncDatabaseWeb({
        schema: AppSchema,
        database: factory,
        crudUploadThrottleMs: 1,
        sync: {
          // You can specify a path to the sync worker
          worker: '/@powersync/worker/SharedSyncImplementation.umd.js'

          // Or provide a factory function to create the worker.
          // The worker name should be unique for the database filename to avoid conflicts if multiple clients with different databases are present.
          // worker: (options) => {
          //   return new SharedWorker(`/@powersync/worker/SharedSyncImplementation.umd.js`, {
          //     name: `shared-sync-${options?.dbFilename}`
          //   });
          // }
        }
      });
    }
    (globalThis as any).db = this.powersync;
  }

  async init() {
    await this.powersync.init();

    const journalMode1 = await this.powersync.get(`PRAGMA journal_mode`);
    console.log('journalMode (read)', journalMode1);

    // const journalMode2 = (await this.powersync.execute(`PRAGMA journal_mode`)).rows?.item(0);
    // console.log('journalMode (write)', journalMode2);

    this.syncStart = Date.now();
    this.powersync.registerListener({
      statusChanged: (status) => {
        if (
          this.syncStart != null &&
          this.syncEnd == null &&
          status.connected &&
          status.hasSynced &&
          !status.dataFlowStatus.downloading
        ) {
          this.syncEnd = Date.now();
        }
      }
    });
    await this.powersync.connect(this.testConnector, {
      params: { size_bucket: AppConfig.sizeBucket }
    });
    this.powersync.onChangeWithCallback(
      {
        onChange: async () => {
          await this.powersync.execute(
            `UPDATE benchmark_items
              SET client_received_at = ?
              WHERE client_received_at IS NULL AND server_created_at IS NOT NULL`,
            [new Date().toISOString()]
          );
        }
      },
      { tables: ['benchmark_items'], throttleMs: 1 }
    );
  }

  get syncTime(): number {
    if (this.syncStart == null) {
      return 0;
    }
    return (this.syncEnd ?? Date.now()) - this.syncStart;
  }

  async resync() {
    await this.powersync.disconnectAndClear();
    this.syncEnd = undefined;
    this.syncStart = Date.now();
    await this.powersync.connect(this.testConnector, {
      params: { size_bucket: AppConfig.sizeBucket }
    });
  }
}

export const system = new System();

export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);
