import '@azure/core-asynciterator-polyfill';
import 'react-native-polyfill-globals/auto';
import React from 'react';
import { AbstractPowerSyncDatabase, RNQSPowerSyncDatabaseOpenFactory } from '@journeyapps/powersync-sdk-react-native';
import { SupabaseStorageAdapter } from '../storage/SupabaseStorageAdapter';

import { AppSchema } from './AppSchema';
import { SupabaseConnector } from '../supabase/SupabaseConnector';
import { KVStorage } from '../storage/KVStorage';
import { PhotoAttachmentQueue } from './PhotoAttachmentQueue';

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
      dbFilename: 'sqlite.db'
    });

    this.supabaseConnector = new SupabaseConnector(this);
    this.storage = this.supabaseConnector.storage;
    this.powersync = factory.getInstance();

    this.attachmentQueue = new PhotoAttachmentQueue({
      powersync: this.powersync,
      storage: this.storage
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
