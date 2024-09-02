import '@azure/core-asynciterator-polyfill';

import { PowerSyncDatabase } from '@powersync/react-native';
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
        // You can specify paths to the workers
        sharedSyncWorker: '/node_modules/@powersync/web/dist/worker_SharedSyncImplementation.umd.js',
        wasqliteDBWorker: '/node_modules/@powersync/web/dist/worker_SharedWASQLiteDB.umd.js'

        // Or provide factory functions to create the workers
        // sharedSyncWorker: () =>
        //   new SharedWorker('/node_modules/@powersync/web/dist/worker_SharedSyncImplementation.umd.js', {
        //     name: `shared-sync-sqlite.db`
        //   }),
        // wasqliteDBWorker: () =>
        //   new SharedWorker(`/node_modules/@powersync/web/dist/worker_SharedWASQLiteDB.umd.js`, {
        //     name: `shared-DB-worker-sqlite.db`
        //   })
      });
      this.powersync = new PowerSyncDatabaseWeb({
        schema: AppSchema,
        database: factory
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
