import '@azure/core-asynciterator-polyfill';

import { createBaseLogger, LogLevel, PowerSyncDatabase } from '@powersync/react-native';
import React from 'react';
import { SupabaseStorageAdapter } from '../storage/SupabaseStorageAdapter';

import { type AttachmentRecord } from '@powersync/attachments';
import { SQLJSOpenFactory } from '@powersync/dev-adapter';
import { configureFts } from '../fts/fts_setup';
import { KVStorage } from '../storage/KVStorage';
import { AppConfig } from '../supabase/AppConfig';
import { SupabaseConnector } from '../supabase/SupabaseConnector';
import { AppSchema } from './AppSchema';
import { PhotoAttachmentQueue } from './PhotoAttachmentQueue';

// console.log(SQLJS);
// const result = SQLJS({ locateFile: (filename: any) => `../dist/${filename}` });
// result.then((SQL: any) => {
//   console.log('SQL.js loaded:');
//   const powersync = new PowerSyncDatabase({
//     schema: AppSchema,
//     // database: {
//     //   dbFilename: 'ddd'
//     // },
//     database: new SQLJSOpenFactory({
//       dbFilename: 'powersync.db',
//       sql: SQL as any,
//       persister: {
//         // TODO
//         readFile: async () => null,
//         writeFile: async () => {}
//       }
//     }),
//     logger
//   });
// });
const logger = createBaseLogger();
logger.useDefaults();
logger.setLevel(LogLevel.DEBUG);

logger.info('ssdaddas');

export class System {
  kvStorage: KVStorage;
  storage: SupabaseStorageAdapter;
  supabaseConnector: SupabaseConnector;
  powersync: PowerSyncDatabase;
  attachmentQueue: PhotoAttachmentQueue | undefined = undefined;

  constructor() {
    this.kvStorage = new KVStorage();
    this.supabaseConnector = new SupabaseConnector(this);
    this.storage = this.supabaseConnector.storage;
    this.powersync = new PowerSyncDatabase({
      schema: AppSchema,
      // database: {
      //   dbFilename: 'ddd'
      // },
      database: new SQLJSOpenFactory({
        dbFilename: 'powersync.db',
        persister: {
          // TODO
          readFile: async () => null,
          writeFile: async () => {}
        }
      }),
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

    // Demo using SQLite Full-Text Search with PowerSync.
    // See https://docs.powersync.com/usage-examples/full-text-search for more details
    await configureFts(this.powersync);
  }
}

export const system = new System();

export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);
