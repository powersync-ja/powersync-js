import '@azure/core-asynciterator-polyfill';
import 'react-native-polyfill-globals/auto';
import React from 'react';
import { configure } from 'mobx';
import {
  AbstractPowerSyncDatabase,
  RNQSPowerSyncDatabaseOpenFactory,
  SyncStreamConnectionMethod
} from '@powersync/react-native';
import { Buffer } from '@craftzdog/react-native-buffer';
import { AppSchema } from '../powersync/AppSchema';
import { DjangoConnector } from '../django/DjangoConnector';

if (typeof process.nextTick == 'undefined') {
  process.nextTick = setImmediate;
}

if (typeof global.Buffer == 'undefined') {
  // @ts-ignore
  global.Buffer = Buffer;
}

configure({
  enforceActions: 'never' // TODO for when PowerSyncDatabase is more observable friendly
});

export class System {
  djangoConnector: DjangoConnector;
  powersync: AbstractPowerSyncDatabase;

  storage: any;

  constructor() {
    const factory = new RNQSPowerSyncDatabaseOpenFactory({
      schema: AppSchema,
      dbFilename: 'sqlite.db'
    });

    this.djangoConnector = new DjangoConnector();
    this.powersync = factory.getInstance();
  }

  async init() {
    await this.powersync.init();
    await this.powersync.connect(this.djangoConnector, { connectionMethod: SyncStreamConnectionMethod.WEB_SOCKET });
  }
}

export const system = new System();

export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);
