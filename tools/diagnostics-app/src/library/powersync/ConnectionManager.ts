import {
  BaseListener,
  createBaseLogger,
  DEFAULT_STREAMING_SYNC_OPTIONS,
  LogLevel,
  PowerSyncDatabase,
  SyncClientImplementation,
  SyncStreamSubscription,
  TemporaryStorageOption,
  WASQLiteOpenFactory,
  WASQLiteVFS,
  WebRemote,
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from '@powersync/web';
import React from 'react';
import { ClientParameterRow, localStateDb } from './LocalStateManager';
import { DynamicSchemaManager } from './DynamicSchemaManager';
import { RustClientInterceptor } from './RustClientInterceptor';
import { TokenConnector } from './TokenConnector';

const baseLogger = createBaseLogger();
baseLogger.useDefaults();
baseLogger.setLevel(LogLevel.DEBUG);

export type JSONValue = string | number | boolean | null | { [key: string]: JSONValue } | JSONValue[];

export type ParameterType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export const CONVERTERS: Record<ParameterType, (v: string) => unknown> = {
  string: (v: string) => v,
  number: (v: string) => Number(v),
  boolean: (v: string) => v === 'true',
  array: (v: string) => (v ? JSON.parse(v) : []),
  object: (v: string) => (v ? JSON.parse(v) : {})
};

export const getParams = async (): Promise<Record<string, JSONValue>> => {
  const currentParams = await localStateDb.getAll<ClientParameterRow>(
    `SELECT key, value FROM client_parameters WHERE key != ''`
  );
  const paramsObject: Record<string, JSONValue> = {};

  for (const p of currentParams) {
    try {
      const parsed = JSON.parse(p.value);
      paramsObject[p.key] = CONVERTERS[parsed.type as ParameterType](parsed.value) as JSONValue;
    } catch {
      paramsObject[p.key] = p.value;
    }
  }

  return paramsObject;
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
export const activeSubscriptions: SyncStreamSubscription[] = [];

export let sync: WebStreamingSyncImplementation | undefined;

// Track the last connection error separately (persists even after disconnect)
let lastConnectionError: Error | undefined;
// Listeners for sync object changes (when sync is recreated)
const syncChangeListeners = new Set<() => void>();

export interface SyncErrorListener extends BaseListener {
  lastErrorUpdated?: ((error: Error) => void) | undefined;
}

function notifySyncChange() {
  syncChangeListeners.forEach((listener) => listener());
}

let _schemaReadyResolve: () => void;
const _schemaReadyPromise = new Promise<void>((resolve) => {
  _schemaReadyResolve = resolve;
});

/**
 * Call after localStateDb is initialized to connect if credentials exist.
 * Loads dynamic schema from local DB and applies it immediately (so views
 * exist before sync starts), then connects if credentials are available.
 */
export async function tryConnectIfCredentials(): Promise<void> {
  await schemaManager.loadFromDb();
  // Ensure db initialization (including its own updateSchema) completes first,
  // so refreshSchemaNow doesn't race with the initial schema application.
  await db.waitForReady();
  await schemaManager.refreshSchemaNow(db);
  _schemaReadyResolve();
  if (await connector.hasCredentials()) {
    await connect();
  }
}

/**
 * Returns true once the persisted dynamic schema has been applied to the database.
 * Use this to gate operations that depend on user tables existing (e.g. auto-executing queries).
 */
export function useSchemaReady(): boolean {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    _schemaReadyPromise.then(() => setReady(true));
  }, []);
  return ready;
}

export async function connect() {
  activeSubscriptions.length = 0;
  lastConnectionError = undefined;
  const client = SyncClientImplementation.RUST;

  await schemaManager.loadFromDb();
  const params = await getParams();
  await sync?.disconnect();
  const remote = new WebRemote(connector);
  const adapter = new RustClientInterceptor(db, remote, schemaManager);

  const syncOptions: WebStreamingSyncImplementationOptions = {
    adapter,
    remote,
    uploadCrud: async () => {
      // No-op
    },
    identifier: 'diagnostics',
    ...DEFAULT_STREAMING_SYNC_OPTIONS,
    subscriptions: []
  };
  sync = new WebStreamingSyncImplementation(syncOptions);
  notifySyncChange();
  await sync.connect({ params, clientImplementation: client });
  await schemaManager.refreshSchemaNow(db);
  if (!sync.syncStatus.connected) {
    const error = sync.syncStatus.dataFlowStatus.downloadError ?? new Error('Failed to connect');
    lastConnectionError = error;
    notifySyncChange();
    await sync.disconnect();
    throw error;
  }
}

export async function clearData() {
  lastConnectionError = undefined;
  await sync?.disconnect();
  await db.disconnectAndClear();
  await schemaManager.clear();
  await schemaManager.refreshSchemaNow(db);
  if (await connector.hasCredentials()) {
    await connect();
  }
}

export async function disconnect() {
  await sync?.disconnect();
}

export async function signOut() {
  lastConnectionError = undefined;
  await connector.clearCredentials();
  await disconnect();
  await db.disconnectAndClear();
  await schemaManager.clear();
  notifySyncChange();
}

/**
 * The current sync status - we can't use `useStatus()` since we're not using the default sync implementation.
 * This hook properly handles sync object recreation and persisted connection errors.
 */
export function useSyncStatus() {
  const [current, setCurrent] = React.useState(sync?.syncStatus);
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  // Re-register listener when sync object changes
  React.useEffect(() => {
    const handleSyncChange = () => {
      setCurrent(sync?.syncStatus);
      forceUpdate();
    };

    syncChangeListeners.add(handleSyncChange);
    return () => {
      syncChangeListeners.delete(handleSyncChange);
    };
  }, []);

  // Listen to status changes on the current sync object
  React.useEffect(() => {
    if (!sync) return;

    setCurrent(sync.syncStatus);
    const l = sync.registerListener({
      statusChanged: (status) => {
        setCurrent(status);
      }
    });
    return () => l?.();
  }, [current]); // Re-run when current changes (triggered by sync recreation)

  // Return status with persisted error if available
  if (current && lastConnectionError && !current.dataFlowStatus?.downloadError) {
    // Use type assertion to preserve the full SyncStatus type after spread
    return {
      ...current,
      dataFlowStatus: {
        ...current.dataFlowStatus,
        downloadError: lastConnectionError
      }
    } as typeof current;
  }

  return current;
}

(window as any).db = db;
