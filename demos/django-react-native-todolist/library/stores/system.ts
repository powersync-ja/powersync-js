import '@azure/core-asynciterator-polyfill';
import 'react-native-polyfill-globals/auto';
import React from 'react';
import { configure, makeAutoObservable, makeObservable, observable } from 'mobx';
import { AbstractPowerSyncDatabase, RNQSPowerSyncDatabaseOpenFactory } from '@journeyapps/powersync-sdk-react-native';
import { AppSchema } from '../powersync/AppSchema';
import { DjangoConnector } from '../django/DjangoConnector';
import { ListStore } from './ListStore';
import { TodoStore } from './TodoStore';

configure({
  enforceActions: 'never' // TODO for when PowerSyncDatabase is more observable friendly
});

export class System {
  djangoConnector: DjangoConnector;
  powersync: AbstractPowerSyncDatabase;

  listStore: ListStore;
  todoStore: TodoStore;

  storage: any;

  constructor() {
    const factory = new RNQSPowerSyncDatabaseOpenFactory({
      schema: AppSchema,
      dbFilename: 'sqlite.db'
    });

    this.djangoConnector = new DjangoConnector();
    this.powersync = factory.getInstance();

    this.listStore = new ListStore(this);
    this.todoStore = new TodoStore(this);

    makeObservable(this.powersync, {
      currentStatus: observable,
      closed: observable
    });
    makeAutoObservable(this);
  }

  async init() {
    await this.powersync.init();
    await this.powersync.connect(this.djangoConnector);

    // Make sure to only watch queries after PowerSync has been initialized as those tables
    // might not exist yet.
    this.listStore.init();
    this.todoStore.init();
  }
}

export const system = new System();

export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);
