import {
  BaseListener,
  createBaseLogger,
  LogLevel,
  PowerSyncDatabase,
  TemporaryStorageOption,
  WASQLiteOpenFactory,
  WASQLiteVFS,
  WebRemote,
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from '@powersync/web';
import { safeParse } from '../safeParse/safeParse';
import { DynamicSchemaManager } from './DynamicSchemaManager';
import { RecordingStorageAdapter } from './RecordingStorageAdapter';
import { TokenConnector } from './TokenConnector';

const baseLogger = createBaseLogger();
baseLogger.useDefaults();
baseLogger.setLevel(LogLevel.DEBUG);

export const PARAMS_STORE = 'currentParams';

export const getParams = () => {
  const stringifiedParams = localStorage.getItem(PARAMS_STORE);
  const params = safeParse(stringifiedParams);
  return params;
};

export const schemaManager = new DynamicSchemaManager();

const openFactory = new WASQLiteOpenFactory({
  dbFilename: 'diagnostics.db',
  debugMode: true,
  cacheSizeKb: 500 * 1024,
  temporaryStorage: TemporaryStorageOption.MEMORY,
  vfs: WASQLiteVFS.OPFSCoopSyncVFS
});

export const db = new PowerSyncDatabase({
  database: openFactory,
  schema: schemaManager.buildSchema()
});

export const connector = new TokenConnector();

const adapter = new RecordingStorageAdapter(db.database, schemaManager);

export let sync: WebStreamingSyncImplementation | undefined;

export interface SyncErrorListener extends BaseListener {
  lastErrorUpdated?: ((error: Error) => void) | undefined;
}

if (connector.hasCredentials()) {
  connect();
}

export async function connect() {
  const params = getParams();
  await sync?.disconnect();
  const remote = new WebRemote(connector);
  const syncOptions: WebStreamingSyncImplementationOptions = {
    adapter,
    remote,
    uploadCrud: async () => {
      // No-op
    },
    identifier: 'diagnostics'
  };
  sync = new WebStreamingSyncImplementation(syncOptions);
  await sync.connect({ params });
  if (!sync.syncStatus.connected) {
    const error = sync.syncStatus.dataFlowStatus.downloadError ?? new Error('Failed to connect');
    // Disconnect but don't wait for it
    await sync.disconnect();
    throw error;
  }
}

export async function clearData() {
  await sync?.disconnect();
  await db.disconnectAndClear();
  await schemaManager.clear();
  await schemaManager.refreshSchema(db.database);
  if (connector.hasCredentials()) {
    const params = getParams();
    await sync?.connect({ params });
  }
}

export async function disconnect() {
  await sync?.disconnect();
}

export async function signOut() {
  connector.clearCredentials();
  await disconnect();
  await db.disconnectAndClear();
  await schemaManager.clear();
}

export const setParams = (p: object) => {
  const stringified = JSON.stringify(p);
  localStorage.setItem(PARAMS_STORE, stringified);
  connect();
};

(window as any).db = db;
