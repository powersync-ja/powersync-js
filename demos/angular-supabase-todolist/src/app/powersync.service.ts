import { Injectable } from '@angular/core';
import {
  column,
  CommonPowerSyncDatabase,
  createConsoleLogger,
  LogLevels,
  PowerSyncBackendConnector,
  PowerSyncDatabase,
  Schema,
  Table,
  WASQLiteOpenFactory,
  WASQLiteVFS
} from '@powersync/web';

export interface ListRecord {
  id: string;
  name: string;
  created_at: string;
  owner_id?: string;
}

export interface TodoRecord {
  id: string;
  created_at: string;
  completed: boolean;
  description: string;
  completed_at?: string;
  created_by: string;
  completed_by?: string;
  list_id: string;
}

export const LISTS_TABLE = 'lists';
export const TODOS_TABLE = 'todos';

export const AppSchema = new Schema({
  [TODOS_TABLE]: new Table(
    {
      list_id: column.text,
      created_at: column.text,
      completed_at: column.text,
      description: column.text,
      completed: column.integer,
      created_by: column.text,
      completed_by: column.text
    },
    { indexes: { list: ['list_id'] } }
  ),
  [LISTS_TABLE]: new Table({
    created_at: column.text,
    name: column.text,
    owner_id: column.text
  })
});

@Injectable({
  providedIn: 'root'
})
export class PowerSyncService {
  db: CommonPowerSyncDatabase;

  constructor() {
    const factory = new WASQLiteOpenFactory({
      logger: createConsoleLogger({ prefix: 'powersync' }),
      open: {
        dbFilename: 'test.db',
        vfs: WASQLiteVFS.OPFSCoopSyncVFS,
        // Specify the path to the worker script
        worker: 'assets/@powersync/worker/WASQLiteDB.umd.js',
        databaseWorkerLogLevel: LogLevels.debug
      }
    });

    this.db = new PowerSyncDatabase({
      schema: AppSchema,
      factory,

      sync: {
        // Specify the path to the worker script
        worker: 'assets/@powersync/worker/SharedSyncImplementation.umd.js'
      }
    });
  }

  setupPowerSync = async (connector: PowerSyncBackendConnector) => {
    try {
      await this.db.init();
      await this.db.connect(connector);
    } catch (e) {
      console.log(e);
    }
  };
}
