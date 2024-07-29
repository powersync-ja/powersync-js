import {
  BaseListener,
  BaseObserver,
  PowerSyncDatabase,
  SyncStreamConnectionMethod,
  WebRemote,
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from '@powersync/web';
import Logger from 'js-logger';
import { DynamicSchemaManager } from './DynamicSchemaManager';
import { RecordingStorageAdapter } from './RecordingStorageAdapter';
import { TokenConnector } from './TokenConnector';

Logger.useDefaults();
Logger.setLevel(Logger.DEBUG);

export const schemaManager = new DynamicSchemaManager();

export const db = new PowerSyncDatabase({
  database: {
    dbFilename: 'example.db',
    debugMode: true
  },
  schema: schemaManager.buildSchema()
});
db.execute('PRAGMA cache_size=-50000');

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
  await sync.connect({ connectionMethod: SyncStreamConnectionMethod.WEB_SOCKET });
  if (!sync.syncStatus.connected) {
    // Disconnect but don't wait for it
    sync.disconnect();
    throw syncErrorTracker.lastSyncError ?? new Error('Failed to conncet');
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
    await sync.connect({ connectionMethod: SyncStreamConnectionMethod.WEB_SOCKET });
  }
}

export async function disconnect() {
  await sync.disconnect();
}

export async function signOut() {
  connector.clearCredentials();
  await db.disconnectAndClear();
}

(window as any).db = db;
