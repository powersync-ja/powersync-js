import '@azure/core-asynciterator-polyfill';

import React from 'react';
import { PowerSyncDatabase as PowerSyncDatabaseNative } from '@powersync/react-native';
import { PowerSyncDatabase as PowerSyncDatabaseWeb, WASQLiteOpenFactory } from '@powersync/web';
import { AbstractPowerSyncDatabase } from '@powersync/common';
import { SupabaseStorageAdapter } from '../storage/SupabaseStorageAdapter';
import { type AttachmentRecord } from '@powersync/attachments';
import Logger from 'js-logger';
import { KVStorage } from '../storage/KVStorage';
import { AppConfig } from '../supabase/AppConfig';
import { SupabaseConnector } from '../supabase/SupabaseConnector';
import { AppSchema } from './AppSchema';
import { PhotoAttachmentQueue } from './PhotoAttachmentQueue';

Logger.useDefaults();

export class System {
  kvStorage: KVStorage;
  storage: SupabaseStorageAdapter;
  supabaseConnector: SupabaseConnector;
  powersync: AbstractPowerSyncDatabase;
  attachmentQueue: PhotoAttachmentQueue | undefined = undefined;

  constructor() {
    this.kvStorage = new KVStorage();
    this.supabaseConnector = new SupabaseConnector(this);
    this.storage = this.supabaseConnector.storage;
    if (PowerSyncDatabaseNative) {
      this.powersync = new PowerSyncDatabaseNative({
        schema: AppSchema,
        database: {
          dbFilename: 'sqlite.db'
        }
      });
    } else {
      const factory = new WASQLiteOpenFactory({
        dbFilename: 'sqlite.db',

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

    if (AppConfig.supabaseBucket) {
      this.attachmentQueue = new PhotoAttachmentQueue({
        powersync: this.powersync,
        storage: this.storage,
        // Use this to handle download errors where you can use the attachment
        // and/or the exception to decide if you want to retry the download
        onDownloadError: async (attachment: AttachmentRecord, exception: any) => {
          if (exception.toString() === 'StorageApiError: Object not found') {
            return { retry: false };
          }

          return { retry: true };
        }
      });
    }
  }

  async init() {
    await this.powersync.init();
    await this.powersync.connect(this.supabaseConnector);

    if (this.attachmentQueue) {
      await this.attachmentQueue.init();
    }
  }
}

export const system = new System();

export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);
