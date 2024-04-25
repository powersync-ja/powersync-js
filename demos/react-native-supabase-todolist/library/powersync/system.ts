import '@azure/core-asynciterator-polyfill';
import 'react-native-polyfill-globals/auto';
import 'react-native-get-random-values';
import React from 'react';
import {
  AbstractPowerSyncDatabase,
  RNQSPowerSyncDatabaseOpenFactory,
  SyncStreamConnectionMethod
} from '@powersync/react-native';
import { SupabaseStorageAdapter } from '../storage/SupabaseStorageAdapter';

import { AppSchema } from './AppSchema';
import { SupabaseConnector } from '../supabase/SupabaseConnector';
import { KVStorage } from '../storage/KVStorage';
import { PhotoAttachmentQueue } from './PhotoAttachmentQueue';
import { type AttachmentRecord } from '@powersync/attachments';

import { Buffer } from '@craftzdog/react-native-buffer';

// Polyfills for Web sockets
if (typeof global.Buffer == 'undefined') {
  // @ts-ignore If using TypeScript
  global.Buffer = Buffer;
}

if (typeof process.nextTick == 'undefined') {
  process.nextTick = setImmediate;
}

export class System {
  kvStorage: KVStorage;
  storage: SupabaseStorageAdapter;
  supabaseConnector: SupabaseConnector;
  powersync: AbstractPowerSyncDatabase;

  attachmentQueue: PhotoAttachmentQueue;

  constructor() {
    this.kvStorage = new KVStorage();
    const factory = new RNQSPowerSyncDatabaseOpenFactory({
      schema: AppSchema,
      dbFilename: 'sqlite.db',
      streamOptions: {
        connectionMethod: SyncStreamConnectionMethod.WEB_SOCKET
      }
    });

    this.supabaseConnector = new SupabaseConnector(this);
    this.storage = this.supabaseConnector.storage;
    this.powersync = factory.getInstance();

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

  async init() {
    await this.powersync.init();
    await this.powersync.connect(this.supabaseConnector);

    await this.attachmentQueue.init();
  }
}

export const system = new System();

export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);
