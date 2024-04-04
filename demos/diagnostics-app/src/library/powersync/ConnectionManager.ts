import {
  WASQLitePowerSyncDatabaseOpenFactory,
  WebRemote,
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from '@journeyapps/powersync-sdk-web';
import Logger from 'js-logger';
import { DynamicSchemaManager } from './DynamicSchemaManager';
import { RecordingStorageAdapter } from './RecordingStorageAdapter';
import { TokenConnector } from './TokenConnector';

Logger.useDefaults();
Logger.setLevel(Logger.DEBUG);

const schemaManager = new DynamicSchemaManager();

export const db = new WASQLitePowerSyncDatabaseOpenFactory({
  dbFilename: 'example.db',
  schema: schemaManager.buildSchema()
}).getInstance();
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

if (connector.hasCredentials()) {
  connect();
}

export async function connect() {
  await sync.connect();
}
export async function clearData() {
  await sync.disconnect();
  await db.disconnectAndClear();
  if (connector.hasCredentials()) {
    await sync.connect();
  }
}

export async function disconnect() {
  await sync.disconnect();
}

(window as any).db = db;
