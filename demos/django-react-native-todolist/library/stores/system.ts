import '@azure/core-asynciterator-polyfill';
import 'react-native-polyfill-globals/auto';
import React from 'react';
import { AbstractPowerSyncDatabase, PowerSyncDatabase, SyncStreamConnectionMethod } from '@powersync/react-native';
import { AppSchema } from '../powersync/AppSchema';
import { DjangoConnector } from '../django/DjangoConnector';

export class System {
  djangoConnector: DjangoConnector;
  powersync: AbstractPowerSyncDatabase;

  storage: any;

  constructor() {
    this.powersync = new PowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: 'sqlite.db' }
    });

    this.djangoConnector = new DjangoConnector();
  }

  async init() {
    await this.powersync.init();
    await this.powersync.connect(this.djangoConnector, { connectionMethod: SyncStreamConnectionMethod.WEB_SOCKET });
  }
}

export const system = new System();

export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);
