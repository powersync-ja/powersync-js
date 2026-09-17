import {
  column,
  PowerSyncDatabase,
  Schema,
  Table,
  WASQLiteVFS,
  type PowerSyncLogger,
  type StreamingSyncRequestParameterType,
  type SyncOptions,
  type TemporaryStorageOption
} from '@powersync/web';

import { JsAgent } from '../agent.js';
import { createBroadcastCoreEvents } from '../core-events.js';
import type { SdkIntegration } from '../integration.js';
import { decodeTokenSubject } from '../jwt.js';
import { isObservedColumn, ObservedSchema, type ObservedSchemaDefinition } from '../observed-schema.js';
import { createDiagnosticsStores, type DiagnosticsStores } from '../store.js';
import { deleteDatabaseFiles } from './delete-database.js';
import { DevTokenConnector } from './dev-token-connector.js';
import {
  createLocalStorageIdentityStore,
  isSameIdentity,
  type SessionIdentity,
  type SessionIdentityStore
} from './session-identity.js';

/** Where the test client keeps its database. */
export interface DiagnosticsStorageOptions {
  /** Defaults to `powersync-diagnostics.db`. One database, reused by every session, so a reconnect keeps what it has. */
  dbFilename?: string;
  /**
   * Defaults to {@link WASQLiteVFS.OPFSCoopSyncVFS}. IndexedDB slows down badly on large databases,
   * and diagnosing sync problems often means syncing a large database.
   */
  vfs?: WASQLiteVFS;
  /** SQLite page cache. A large cache helps the SQL console on large databases. */
  cacheSizeKb?: number;
  temporaryStorage?: TemporaryStorageOption;
}

export interface DiagnosticsSessionOptions {
  endpoint: string;
  token: string;
  /** Connection parameters, sent with the sync request. */
  clientParams?: Record<string, StreamingSyncRequestParameterType>;
  storage?: DiagnosticsStorageOptions;
  /** The label reported by `getInfo().sdk`. Defaults to `@powersync/web`. */
  sdk?: string;
  /** Remembers who last used the database. Defaults to `localStorage`. */
  identityStore?: SessionIdentityStore;
}

/** A headless PowerSync client syncing as a user, served through the diagnostics protocol. */
export interface DiagnosticsSession {
  /** Identifies this session's data in a host's cache, so a new one never reads the last one's. */
  id: string;
  options: DiagnosticsSessionOptions;
  /** The protocol view of the client: SQL, info, actions, events. */
  integration: SdkIntegration;
  /** Reactive state derived from the integration's events. */
  stores: DiagnosticsStores;
  /** The live database, for hosts that need more than the protocol offers. */
  database: PowerSyncDatabase;
  /** Fires after an inferred schema was applied, so views can re-read table lists. */
  onSchemaApplied(listener: () => void): () => void;
  /**
   * Drops every subscription to a stream, so it stops syncing now: the protocol's `unsubscribeStream`
   * with `mode: 'all'`. Releasing a subscription from a diagnostics view means the stream should go,
   * not start a TTL.
   */
  unsubscribeAll(name: string, params?: Record<string, unknown>): Promise<void>;
  /**
   * Starts over: closes the client, deletes the database files and opens a new session with the same
   * options. Unlike the protocol's `clearData`, which deletes row by row, this is quick however large
   * the database has grown.
   */
  reset(): Promise<DiagnosticsSession>;
  dispose(): Promise<void>;
}

const DEFAULT_DB_FILENAME = 'powersync-diagnostics.db';
const DEFAULT_VFS = WASQLiteVFS.OPFSCoopSyncVFS;
/** Long enough for the first download batch to report all of its columns, so one reconnect applies them. */
const SCHEMA_APPLY_DEBOUNCE_MS = 1000;
/**
 * How long a pending schema waits for the download to finish.
 *
 * Applying a schema is a disconnect and reconnect, which interrupts whatever is downloading. New
 * columns arrive all through a first sync, so applying each one as it lands would keep cutting that
 * sync short. Past this the tables are worth more than an uninterrupted download.
 */
const SCHEMA_APPLY_MAX_WAIT_MS = 20_000;
/** Rows read per table when recovering the schema of a database an earlier session downloaded. */
const STORED_SCHEMA_SAMPLE_SIZE = 25;

/**
 * Stays quiet on the console: the agent forwards every record to the protocol's `logs` events, and a
 * host has its own client logging there already.
 */
const silentLogger: PowerSyncLogger = { log: () => {} };

const toSdkSchema = (definition: ObservedSchemaDefinition): Schema => {
  const tables: Record<string, Table> = {};
  for (const table of definition.tables) {
    const columns: Record<string, typeof column.text> = {};
    for (const observed of table.columns) {
      columns[observed.name] =
        observed.type === 'INTEGER' ? column.integer : observed.type === 'REAL' ? column.real : column.text;
    }
    tables[table.name] = new Table(columns);
  }
  return new Schema(tables);
};

/**
 * Recovers the schema from data the database already holds.
 *
 * A session inherits the rows earlier sessions downloaded, but the core only reports columns for
 * rows it is applying: with nothing left to download, nothing would be announced and every stored
 * row would sit in `ps_untyped` with no view to query. Sampling the operation log rebuilds those
 * tables. Columns the sample misses are picked up from the next download.
 */
async function observeStoredSchema(db: PowerSyncDatabase, schema: ObservedSchema): Promise<boolean> {
  const tables = await db.getAll<{ row_type: unknown }>('SELECT DISTINCT row_type FROM ps_oplog');
  let hasObserved = false;
  for (const { row_type } of tables) {
    if (typeof row_type !== 'string') {
      continue;
    }
    const rows = await db.getAll<{ data: unknown }>(
      'SELECT data FROM ps_oplog WHERE row_type = ? AND data IS NOT NULL ORDER BY op_id DESC LIMIT ?',
      [row_type, STORED_SCHEMA_SAMPLE_SIZE]
    );
    for (const { data } of rows) {
      if (typeof data === 'string') {
        hasObserved = schema.observeStoredRow(row_type, data) || hasObserved;
      }
    }
  }
  return hasObserved;
}

/**
 * Decides what of the last session's state this one keeps. Another user's (or instance's) rows are
 * not this session's to show, so they are cleared; for the same user only the runtime subscriptions
 * go, since they were made for a session that is over and would otherwise keep syncing until their
 * TTL ran out.
 */
async function prepareStoredState(
  db: PowerSyncDatabase,
  agent: JsAgent,
  options: DiagnosticsSessionOptions,
  identities: SessionIdentityStore
): Promise<void> {
  const identity: SessionIdentity = { endpoint: options.endpoint, subject: decodeTokenSubject(options.token) };
  const last = identities.read();
  if (last !== null && !isSameIdentity(last, identity)) {
    await db.disconnectAndClear();
  } else {
    await agent.action({ action: 'unsubscribeAllStreams' });
  }
  identities.remember(identity);
}

/**
 * Opens a headless PowerSync client against an instance and serves it through the diagnostics
 * protocol, in-process: the returned {@link SdkIntegration} is the agent itself.
 *
 * The same local database is reused for every session, so connecting again as the same user resumes
 * from what has already been downloaded instead of syncing it all again. Subscriptions made in the
 * last session are released first, so a streams view shows what this session asked for; a session
 * for another user or instance starts from a cleared database. As the core reports columns it sees
 * (`SchemaChange` diagnostics events) the schema is inferred and applied, which moves downloaded
 * rows out of `ps_untyped` into queryable tables. The SDK refuses schema updates while connected,
 * so each application is a short disconnect and reconnect; the core keeps its download progress
 * across it.
 */
export async function openDiagnosticsSession(options: DiagnosticsSessionOptions): Promise<DiagnosticsSession> {
  const storage = options.storage ?? {};
  const dbFilename = storage.dbFilename ?? DEFAULT_DB_FILENAME;
  const vfs = storage.vfs ?? DEFAULT_VFS;
  const identities = options.identityStore ?? createLocalStorageIdentityStore();

  const db = new PowerSyncDatabase({
    schema: new Schema([]),
    database: {
      dbFilename,
      vfs,
      // The client runs in this page alone; sharing it across tabs would only add locking.
      enableMultiTabs: false,
      ...(storage.cacheSizeKb !== undefined ? { cacheSizeKb: storage.cacheSizeKb } : {}),
      ...(storage.temporaryStorage !== undefined ? { temporaryStorage: storage.temporaryStorage } : {})
    },
    logger: silentLogger
  });

  const connector = new DevTokenConnector({ endpoint: options.endpoint, token: options.token });
  const syncOptions: SyncOptions = { params: options.clientParams, diagnostics: true };

  const agent = new JsAgent(db, {
    sdk: options.sdk ?? '@powersync/web',
    coreEvents: createBroadcastCoreEvents(),
    connection: {
      // The session made the connector and options, so it hands them over rather than reading the
      // SDK's non-public surface. A `reconnect` action then reuses the same `diagnostics: true` options.
      getConnector: () => connector,
      getConnectionOptions: () => syncOptions
    }
  });

  const observedSchema = new ObservedSchema();
  const schemaListeners = new Set<() => void>();
  let applyTimer: ReturnType<typeof setTimeout> | undefined;
  /** When the first column of the pending schema was seen, which caps how long it waits. */
  let pendingSchemaSince: number | null = null;
  let applyQueue = Promise.resolve();
  let isDisposed = false;
  let stopSchemaEvents: Promise<() => void> = Promise.resolve(() => {});
  let stores: DiagnosticsStores | null = null;

  const applySchema = async () => {
    if (isDisposed) {
      return;
    }
    await db.disconnect();
    await db.updateSchema(toSdkSchema(observedSchema.toSchema()));
    if (isDisposed) {
      return;
    }
    await db.connect(connector, syncOptions);
    for (const listener of schemaListeners) {
      listener();
    }
  };

  const scheduleSchemaApply = () => {
    pendingSchemaSince ??= Date.now();
    clearTimeout(applyTimer);
    applyTimer = setTimeout(() => {
      const hasWaitedLongEnough = Date.now() - (pendingSchemaSince ?? 0) >= SCHEMA_APPLY_MAX_WAIT_MS;
      if (db.currentStatus.downloading && !hasWaitedLongEnough) {
        scheduleSchemaApply();
        return;
      }
      pendingSchemaSince = null;
      applyQueue = applyQueue.then(applySchema).catch((error: unknown) => {
        console.warn('Failed to apply the inferred diagnostics schema', error);
      });
    }, SCHEMA_APPLY_DEBOUNCE_MS);
  };

  const dispose = async () => {
    isDisposed = true;
    clearTimeout(applyTimer);
    (await stopSchemaEvents)();
    stores?.dispose();
    await applyQueue;
    await agent.close();
    await db.disconnect();
    await db.close();
  };

  try {
    await db.waitForReady();
    await prepareStoredState(db, agent, options, identities);
    // The database is opened with an empty schema, which drops the views an earlier session
    // created, so the tables behind them are declared again before anything reads them.
    if (await observeStoredSchema(db, observedSchema)) {
      await db.updateSchema(toSdkSchema(observedSchema.toSchema()));
    }

    // Subscribing starts the agent, so it is listening before the client connects.
    stores = createDiagnosticsStores(agent);
    stopSchemaEvents = agent.observeEvents((event) => {
      if (event.type !== 'core' || !('SchemaChange' in event.payload)) {
        return;
      }
      const observed = event.payload.SchemaChange;
      if (isObservedColumn(observed) && observedSchema.observe(observed)) {
        scheduleSchemaApply();
      }
    });

    await db.connect(connector, syncOptions);
  } catch (error: unknown) {
    await dispose().catch(() => {
      // The startup error is the one worth reporting.
    });
    throw error;
  }

  return {
    id: crypto.randomUUID(),
    options,
    integration: agent,
    stores,
    database: db,
    onSchemaApplied(listener) {
      schemaListeners.add(listener);
      return () => {
        schemaListeners.delete(listener);
      };
    },
    unsubscribeAll: (name, params) =>
      agent.action({ action: 'unsubscribeStream', args: { name, params, mode: 'all' } }),
    async reset() {
      await dispose();
      await deleteDatabaseFiles({ dbFilename, vfs });
      return openDiagnosticsSession(options);
    },
    dispose
  };
}
