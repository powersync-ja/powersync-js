import '@azure/core-asynciterator-polyfill';

import { createBaseLogger, LogLevel, PowerSyncDatabase, SyncClientImplementation,   
  AttachmentQueue, 
  type AttachmentRecord, 
  ExpoFileSystemAdapter, 
  type WatchedAttachmentItem } from '@powersync/react-native';
import React from 'react';
import { configureFts } from '../fts/fts_setup';
import { KVStorage } from '../storage/KVStorage';
import { SupabaseRemoteStorageAdapter } from '../storage/SupabaseRemoteStorageAdapter';
import { AppConfig } from '../supabase/AppConfig';
import { SupabaseConnector } from '../supabase/SupabaseConnector';
import { AppSchema, TODO_TABLE } from './AppSchema';

const logger = createBaseLogger();
logger.useDefaults();
logger.setLevel(LogLevel.DEBUG);

export class System {
  kvStorage: KVStorage;
  supabaseConnector: SupabaseConnector;
  powersync: PowerSyncDatabase;
  photoAttachmentQueue: AttachmentQueue | undefined = undefined;

  constructor() {
    this.kvStorage = new KVStorage();
    this.supabaseConnector = new SupabaseConnector({
      kvStorage: this.kvStorage,
      supabaseUrl: AppConfig.supabaseUrl,
      supabaseAnonKey: AppConfig.supabaseAnonKey
    });
    
    this.powersync = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'sqlite.db'
      },
      logger
    });
    /**
     * The snippet below uses OP-SQLite as the default database adapter.
     * You will have to uninstall `@journeyapps/react-native-quick-sqlite` and
     * install both `@powersync/op-sqlite` and `@op-engineering/op-sqlite` to use this.
     *
     * ```typescript
     * import { OPSqliteOpenFactory } from '@powersync/op-sqlite'; // Add this import
     *
     * const factory = new OPSqliteOpenFactory({
     *  dbFilename: 'sqlite.db'
     * });
     * this.powersync = new PowerSyncDatabase({ database: factory, schema: AppSchema });
     * ```
     */

    if (AppConfig.supabaseBucket) {
      const localStorage = new ExpoFileSystemAdapter();
      const remoteStorage = new SupabaseRemoteStorageAdapter({
        client: this.supabaseConnector.client,
        bucket: AppConfig.supabaseBucket
      });

      this.photoAttachmentQueue = new AttachmentQueue({
        db: this.powersync,
        localStorage,
        remoteStorage,
        watchAttachments: (onUpdate) => {
          this.powersync.watch(
            `SELECT photo_id as id FROM ${TODO_TABLE} WHERE photo_id IS NOT NULL`,
            [],
            {
              onResult: (result: any) => {
                const attachments: WatchedAttachmentItem[] = (result.rows?._array ?? []).map((row: any) => ({
                  id: row.id,
                  fileExtension: 'jpg'
                }));
                onUpdate(attachments);
              }
            }
          );
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
        logger,
      });
    }
  }

  async init() {
    await this.powersync.init();
    await this.powersync.connect(this.supabaseConnector, { clientImplementation: SyncClientImplementation.RUST });

    if (this.photoAttachmentQueue) {
      await this.photoAttachmentQueue.startSync();
    }

    // Demo using SQLite Full-Text Search with PowerSync.
    // See https://docs.powersync.com/usage-examples/full-text-search for more details
    await configureFts(this.powersync);
  }
}

export const system = new System();

export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);
