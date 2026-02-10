import {
  column,
  PowerSyncDatabase,
  Schema,
  Table,
  TemporaryStorageOption,
  WASQLiteOpenFactory,
  WASQLiteVFS
} from '@powersync/web';

const query_history = new Table(
  {
    query: column.text,
    executed_at: column.text
  },
  { localOnly: true }
);

/** Key-value store for powersync_credential and dynamic_schema only. */
const app_settings = new Table(
  {
    key: column.text,
    value: column.text
  },
  { localOnly: true }
);

/** User-defined sync parameters (key, value, type) sent with sync requests. */
const client_parameters = new Table(
  {
    key: column.text,
    value: column.text,
    created_at: column.text
  },
  { localOnly: true }
);

const LocalStateSchema = new Schema({
  query_history,
  app_settings,
  client_parameters
});

const openFactory = new WASQLiteOpenFactory({
  dbFilename: 'diagnostics-local-state.db',
  debugMode: true,
  cacheSizeKb: 100 * 1024,
  temporaryStorage: TemporaryStorageOption.MEMORY,
  vfs: WASQLiteVFS.OPFSCoopSyncVFS
});

/**
 * Local-only PowerSync database for app state:
 * - query_history: SQL console history
 * - app_settings: powersync_credential, dynamic_schema (key-value)
 * - client_parameters: user-defined sync parameters
 *
 * Components can use PowerSyncContext.Provider value={localStateDb} for useQuery/usePowerSync.
 */
export const localStateDb = new PowerSyncDatabase({
  database: openFactory,
  schema: LocalStateSchema
});

export type QueryHistory = {
  id: string;
  query: string;
  executed_at: string;
};

export type AppSettingsRow = {
  id: string;
  key: string;
  value: string;
};

export type ClientParameterRow = {
  id: string;
  key: string;
  value: string;
  created_at?: string | null;
};
