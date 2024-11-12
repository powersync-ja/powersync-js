import {
  BaseListener,
  BaseObserver,
  PowerSyncDatabase,
  WebRemote,
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from '@powersync/web';
import Logger from 'js-logger';
import { DynamicSchemaManager } from './DynamicSchemaManager';
import { RecordingStorageAdapter } from './RecordingStorageAdapter';
import { TokenConnector } from './TokenConnector';
import { safeParse } from '../safeParse/safeParse';

Logger.useDefaults();
Logger.setLevel(Logger.DEBUG);

export const PARAMS_STORE = 'currentParams';

export const getParams = () => {
  const stringifiedParams = localStorage.getItem(PARAMS_STORE);
  const params = safeParse(stringifiedParams);
  return params;
};

export const schemaManager = new DynamicSchemaManager();

export const db = new PowerSyncDatabase({
  database: {
    dbFilename: 'example.db',
    debugMode: true
  },
  schema: schemaManager.buildSchema()
});
db.execute('PRAGMA cache_size=-500000');

export const connector = new TokenConnector();

const remote = new WebRemote(connector);
const adapter = new RecordingStorageAdapter(db.database, schemaManager);

const syncOptions: WebStreamingSyncImplementationOptions = {
  adapter,
  remote,
  uploadCrud: async () => {
    // No-op
  },
  identifier: 'diagnostics'
};
export const sync = new WebStreamingSyncImplementation(syncOptions);

export interface SyncErrorListener extends BaseListener {
  lastErrorUpdated?: ((error: Error) => void) | undefined;
}

class SyncErrorTracker extends BaseObserver<SyncErrorListener> {
  public lastSyncError: Error | null = null;

  constructor() {
    super();
    // Big hack: Use the logger to get access to connection errors
    const defaultHandler = Logger.createDefaultHandler();
    Logger.setHandler((messages, context) => {
      defaultHandler(messages, context);
      if (context.name == 'PowerSyncStream' && context.level.name == 'ERROR') {
        if (messages[0] instanceof Error) {
          this.lastSyncError = messages[0];
        } else {
          this.lastSyncError = new Error('' + messages[0]);
        }
        this.iterateListeners((listener) => {
          listener.lastErrorUpdated?.(this.lastSyncError!);
        });
      }
    });
  }
}

export const syncErrorTracker = new SyncErrorTracker();

if (connector.hasCredentials()) {
  connect();
}

export async function connect() {
  const params = getParams();
  await sync.connect({ params });
  if (!sync.syncStatus.connected) {
    // Disconnect but don't wait for it
    sync.disconnect();
    throw syncErrorTracker.lastSyncError ?? new Error('Failed to connect');
  } else {
    syncErrorTracker.lastSyncError = null;
  }
}

export async function clearData() {
  await sync.disconnect();
  await db.disconnectAndClear();
  await schemaManager.clear();
  await schemaManager.refreshSchema(db.database);
  if (connector.hasCredentials()) {
    const params = getParams();
    await sync.connect({ params });
  }
}

export async function disconnect() {
  await sync.disconnect();
}

export async function signOut() {
  connector.clearCredentials();
  await db.disconnectAndClear();
  await schemaManager.clear();
}

export const setParams = (p: object) => {
  const stringified = JSON.stringify(p);
  localStorage.setItem(PARAMS_STORE, stringified);
  connect();
};

(window as any).db = db;
