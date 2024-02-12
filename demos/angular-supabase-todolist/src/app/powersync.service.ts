import { Injectable } from '@angular/core';
import {
  AbstractPowerSyncDatabase,
  Column,
  ColumnType,
  Index,
  IndexedColumn,
  PowerSyncBackendConnector,
  Schema,
  Table,
  WASQLitePowerSyncDatabaseOpenFactory
} from '@journeyapps/powersync-sdk-web';

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

export const AppSchema = new Schema([
  new Table({
    name: TODOS_TABLE,
    columns: [
      new Column({ name: 'list_id', type: ColumnType.TEXT }),
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'completed_at', type: ColumnType.TEXT }),
      new Column({ name: 'description', type: ColumnType.TEXT }),
      new Column({ name: 'completed', type: ColumnType.INTEGER }),
      new Column({ name: 'created_by', type: ColumnType.TEXT }),
      new Column({ name: 'completed_by', type: ColumnType.TEXT })
    ],
    indexes: [new Index({ name: 'list', columns: [new IndexedColumn({ name: 'list_id' })] })]
  }),
  new Table({
    name: LISTS_TABLE,
    columns: [
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'name', type: ColumnType.TEXT }),
      new Column({ name: 'owner_id', type: ColumnType.TEXT })
    ]
  })
]);

@Injectable({
  providedIn: 'root'
})
export class PowerSyncService {
  db: AbstractPowerSyncDatabase;

  constructor() {
    const PowerSyncFactory = new WASQLitePowerSyncDatabaseOpenFactory({
      schema: AppSchema,
      dbFilename: 'test.db'
    });
    this.db = PowerSyncFactory.getInstance();
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
