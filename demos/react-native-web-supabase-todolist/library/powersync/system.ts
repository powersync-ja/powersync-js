import '@azure/core-asynciterator-polyfill';

import React from 'react';
import {
  PowerSyncDatabase as PowerSyncDatabaseNative,
  AbstractPowerSyncDatabase,
  ReactNativeFileSystemStorageAdapter
} from '@powersync/react-native';
import {
  PowerSyncDatabase as PowerSyncDatabaseWeb,
  WASQLiteOpenFactory,
  IndexDBFileSystemStorageAdapter
} from '@powersync/web';
import {
  type AttachmentRecord,
  AttachmentQueue,
  LogLevel,
  createBaseLogger,
  WatchedAttachmentItem
} from '@powersync/common';
import { SupabaseRemoteStorageAdapter } from '../storage/SupabaseRemoteStorageAdapter';
import { ExpoKVStorage, WebKVStorage } from '../storage/KVStorage';
import { AppConfig } from '../supabase/AppConfig';
import { SupabaseConnector } from '../supabase/SupabaseConnector';
import { AppSchema, TODO_TABLE } from './AppSchema';
import { Platform } from 'react-native';

const logger = createBaseLogger();
logger.useDefaults();
logger.setLevel(LogLevel.DEBUG);

export class System {
  kvStorage: ExpoKVStorage | WebKVStorage;
  supabaseConnector: SupabaseConnector;
  powersync: AbstractPowerSyncDatabase;
  photoAttachmentQueue: AttachmentQueue | undefined = undefined;

  constructor() {
    this.kvStorage = Platform.OS === 'web' ? new WebKVStorage() : new ExpoKVStorage();
    this.supabaseConnector = new SupabaseConnector({
      kvStorage: this.kvStorage,
      supabaseUrl: AppConfig.supabaseUrl,
      supabaseAnonKey: AppConfig.supabaseAnonKey
    });
    if (PowerSyncDatabaseNative) {
      this.powersync = new PowerSyncDatabaseNative({
        schema: AppSchema,
        database: {
          dbFilename: 'sqlite.db'
        },
        logger
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
        },
        logger
      });
    }

    if (AppConfig.supabaseBucket) {
      const isWeb = Platform.OS === 'web';
      const localStorage = isWeb ? new IndexDBFileSystemStorageAdapter() : new ReactNativeFileSystemStorageAdapter();
      const remoteStorage = new SupabaseRemoteStorageAdapter({
        client: this.supabaseConnector.client,
        bucket: AppConfig.supabaseBucket
      });
      this.photoAttachmentQueue = new AttachmentQueue({
        db: this.powersync,
        localStorage,
        remoteStorage,
        watchAttachments: async (onUpdate, signal) => {
          const watcher = this.powersync.watch(
            `SELECT photo_id as id FROM ${TODO_TABLE} WHERE photo_id IS NOT NULL`,
            [],
            {
              signal
            }
          );

          for await (const result of watcher) {
            const attachments: WatchedAttachmentItem[] = (result.rows?._array ?? []).map((row: any) => ({
              id: row.id,
              fileExtension: 'jpg'
            }));
            await onUpdate(attachments);
          }
        },
        errorHandler: {
          onDownloadError: async (attachment: AttachmentRecord, error: Error) => {
            if (error.toString() === 'StorageApiError: Object not found') {
              return false; // Don't retry
            }
            return true; // Retry
          },
          onUploadError: async (attachment: AttachmentRecord, error: Error) => {
            return true; // Retry uploads by default
          },
          onDeleteError: async (attachment: AttachmentRecord, error: Error) => {
            return true; // Retry deletes by default
          }
        },
        logger
      });
    }
  }

  async init() {
    await this.powersync.init();
    await this.powersync.connect(this.supabaseConnector);

    if (this.photoAttachmentQueue) {
      // await this.photoAttachmentQueue.localStorage.initialize();
      await this.photoAttachmentQueue.startSync();
    }
  }
}

export const system = new System();

export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);
