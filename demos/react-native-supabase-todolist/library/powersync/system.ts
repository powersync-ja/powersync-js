import '@azure/core-asynciterator-polyfill';

import { PowerSyncDatabase } from '@powersync/react-native';
import React from 'react';
import S3 from 'aws-sdk/clients/s3';
import { type AttachmentRecord, StorageAdapter } from '@powersync/attachments';
import Logger from 'js-logger';
import { KVStorage } from '../storage/KVStorage';
import { AppConfig } from '../supabase/AppConfig';
import { SupabaseConnector } from '../supabase/SupabaseConnector';
import { AppSchema } from './AppSchema';
import { PhotoAttachmentQueue } from './PhotoAttachmentQueue';
import { createClient } from '@supabase/supabase-js';
import { SupabaseStorageAdapter } from '../storage/SupabaseStorageAdapter';
import { AWSConfig } from '../storage/AWSConfig';
import { AWSStorageAdapter } from '../storage/AWSStorageAdapter';

Logger.useDefaults();

export class System {
  kvStorage: KVStorage;
  storage: StorageAdapter;
  supabaseConnector: SupabaseConnector;
  powersync: PowerSyncDatabase;
  attachmentQueue: PhotoAttachmentQueue | undefined = undefined;

  constructor() {
    this.kvStorage = new KVStorage();
    this.supabaseConnector = new SupabaseConnector(this);
    this.storage = getStorageAdapter(this);
    this.powersync = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'sqlite.db'
      }
    });
    /**
     * The snippet below uses OP-SQLite as the default database adapter.
     * You will have to uninstall `@journeyapps/react-native-quick-sqlite` and
     * install both `@powersync/op-sqlite` and `@op-engineering/op-sqlite` to use this.
     *
     * import { OPSqliteOpenFactory } from '@powersync/op-sqlite'; // Add this import
     *
     * const factory = new OPSqliteOpenFactory({
     * dbFilename: 'sqlite.db'
     * });
     * this.powersync = new PowerSyncDatabase({ database: factory, schema: AppSchema });
     */

    if (AppConfig.supabaseBucket || AppConfig.s3bucketName) {
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

function getStorageAdapter(system: System): StorageAdapter {
  const storageProvider = AppConfig.storageOption;

  if (storageProvider === 'supabase') {
    const client = createClient(AppConfig.supabaseUrl, AppConfig.supabaseAnonKey, {
      auth: {
        persistSession: true,
        storage: system.kvStorage
      }
    });
    return new SupabaseStorageAdapter({ client: client });
  } else if (storageProvider === 's3') {
    const s3Client = new S3({
      region: AWSConfig.region,
      credentials: {
        accessKeyId: AWSConfig.accessKeyId,
        secretAccessKey: AWSConfig.secretAccessKey
      }
    });
    return new AWSStorageAdapter({ client: s3Client });
  } else {
    throw new Error('Invalid storage provider specified in STORAGE_PROVIDER');
  }
}

export const system = new System();

export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);
