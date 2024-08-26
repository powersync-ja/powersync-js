import '@azure/core-asynciterator-polyfill';
import { AbstractPowerSyncDatabase, PowerSyncDatabase } from '@powersync/react-native';
import React from 'react';
import { DjangoConnector } from '../django/DjangoConnector';
import { AppSchema } from '../powersync/AppSchema';

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
    await this.powersync.connect(this.djangoConnector);
  }
}

export const system = new System();

export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);
