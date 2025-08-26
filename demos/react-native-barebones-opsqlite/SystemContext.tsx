import { open } from '@op-engineering/op-sqlite';
import { sqliteTable, SQLiteTableWithColumns, text } from 'drizzle-orm/sqlite-core';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import {
  AbstractPowerSyncDatabase,
  column,
  createBaseLogger,
  LogLevel,
  PowerSyncDatabase,
  Schema,
  Table
} from '@powersync/react-native';
import React from 'react';
import { DrizzleAppSchema, PowerSyncSQLiteDatabase, wrapPowerSyncWithDrizzle } from '@powersync/drizzle-driver';
import {
  PowerSyncSQLiteDatabase as PowerSyncSQLiteDatabaseSync,
  wrapPowerSyncWithDrizzle as wrapPowerSyncWithDrizzleSync
} from '@powersync/drizzle-driver-sync';
import { relations } from 'drizzle-orm';

const logger = createBaseLogger();
logger.useDefaults();
logger.setLevel(LogLevel.DEBUG);

export class SelfhostConnector {
  private _clientId: string | null = null;

  async fetchCredentials() {
    const token = await fetch('http://localhost:6060/api/auth/token')
      .then((response) => response.json())
      .then((data) => data.token);

    console.log('Fetched token:', token);
    return {
      endpoint: 'http://localhost:8080',
      token
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    if (!this._clientId) {
      this._clientId = await database.getClientId();
    }

    try {
      let batch: any[] = [];
      for (let operation of transaction.crud) {
        let payload = {
          op: operation.op,
          table: operation.table,
          id: operation.id,
          data: operation.opData
        };
        batch.push(payload);
      }

      const response = await fetch(`http://localhost:6060/api/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ batch })
      });

      if (!response.ok) {
        throw new Error(`Received ${response.status} from /api/data: ${await response.text()}`);
      }

      await transaction
        .complete
        // import.meta.env.VITE_CHECKPOINT_MODE == CheckpointMode.CUSTOM
        //   ? await this.getCheckpoint(this._clientId)
        //   : undefined
        ();
      console.log('Transaction completed successfully');
    } catch (ex: any) {
      console.debug(ex);
      throw ex;
    }
  }
}

// const lists = new Table({ name: column.text });

export const lists = sqliteTable('lists', {
  id: text('id'),
  name: text('name')
});

export const todos = sqliteTable('todos', {
  id: text('id'),
  description: text('description'),
  list_id: text('list_id'),
  created_at: text('created_at')
});

export const listsRelations = relations(lists, ({ one, many }) => ({
  todos: many(todos)
}));

export const todosRelations = relations(todos, ({ one, many }) => ({
  list: one(lists, {
    fields: [todos.list_id],
    references: [lists.id]
  })
}));



const drizzleSchema = {
  lists,
  todos,
  listsRelations,
  todosRelations
};


const schema = new DrizzleAppSchema(drizzleSchema)

export const DB_NAME = 'powersync-test.db';

export class System {
  connector: SelfhostConnector;
  powersync: PowerSyncDatabase;
  drizzle: PowerSyncSQLiteDatabase<typeof drizzleSchema>;
  drizzleSync: PowerSyncSQLiteDatabaseSync<typeof drizzleSchema>;

  constructor() {
    this.connector = new SelfhostConnector();
    this.powersync = new PowerSyncDatabase({
      schema,
      database: new OPSqliteOpenFactory({
        dbFilename: DB_NAME
      }),
      logger
    });

    this.drizzle = wrapPowerSyncWithDrizzle(this.powersync, {
      schema: drizzleSchema
    });

    const opSqlite = open({
      name: DB_NAME
    });
    this.drizzleSync = wrapPowerSyncWithDrizzleSync(opSqlite, {
      schema: drizzleSchema
    });
  }

  async init() {
    await this.powersync.init();
    await this.powersync.connect(this.connector, {
      // clientImplementation: SyncClientImplementation.RUST
    });

    await this.powersync.waitForFirstSync();
    // await this.powersync.executeRaw("PRAGMA busy_timeout = 5000;");
  }
}

export const system = new System();
export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);

const opSqlite = open({
  name: DB_NAME
});
export const OpSqliteContext = React.createContext(opSqlite);
export const useOpSqlite = () => React.useContext(OpSqliteContext);
