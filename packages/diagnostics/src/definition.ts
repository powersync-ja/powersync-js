/**
 * The PowerSync devframe definition: the node side every host mounts (a Vite DevTools dock, a node
 * app's own dev server).
 *
 * It exposes `SdkIntegration` one RPC function per method. The databases it serves are *sources*:
 * an integration living in this process (a node app), or a `RemoteIntegration` that forwards to a
 * connected page or app which announced itself with `page-register`. UI clients subscribe with
 * `observe` and receive pushed `DiagnosticsEvent`s; agents reach the same functions over MCP.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { defineDevframe, defineRpcFunction, type DevframeNodeContext, type DevframeNodeRpcSession } from 'devframe';
import { z } from 'zod';
import type {
  ActionRequest,
  DiagnosticsEvent,
  ProtocolInfo,
  QueryParams,
  QueryResult,
  SchemaPayload,
  SdkIntegration,
  SyncState,
  Unsubscribe,
  UploadQueueState
} from '@powersync/diagnostics-core';
import { DEVFRAME_ID, HEARTBEAT_MS, UI_ROUTE } from './constants.js';
import type { SourceInfo } from './rpc-types.js';

export type { SourceInfo } from './rpc-types.js';

/** Event types replayed to a UI that subscribes late. `logs` and `core` are not replayed. */
const SNAPSHOT_TYPES = new Set<DiagnosticsEvent['type']>(['status', 'streams', 'buckets', 'uploadQueue']);

interface Source extends SourceInfo {
  integration: SdkIntegration;
  /** False once the page or app that served this database has gone. */
  alive(): boolean;
  /** When the serving page last reported in; `null` for a database in this process. */
  lastSeen: number | null;
  /** The latest snapshot per event type, for late subscribers. */
  snapshots: Map<string, DiagnosticsEvent>;
  stop?: Unsubscribe;
}

/**
 * Calls into a page or app that serves a database over its own devframe connection. `sourceId` is
 * the id the page serves it under, which differs from the id the node side lists when several pages
 * announce the same one.
 */
class RemoteIntegration implements SdkIntegration {
  constructor(
    private session: DevframeNodeRpcSession,
    private sourceId: string
  ) {}

  get closed(): boolean {
    return this.session.rpc.$closed;
  }

  runQuery(params: QueryParams): Promise<QueryResult> {
    return this.session.rpc.$call('powersync:page-query', this.sourceId, params);
  }
  getSchema(): Promise<SchemaPayload> {
    return this.session.rpc.$call('powersync:page-schema', this.sourceId);
  }
  getInfo(): Promise<ProtocolInfo> {
    return this.session.rpc.$call('powersync:page-info', this.sourceId);
  }
  currentSyncStatus(): Promise<SyncState> {
    return this.session.rpc.$call('powersync:page-status', this.sourceId);
  }
  getUploadQueueStats(): Promise<UploadQueueState> {
    return this.session.rpc.$call('powersync:page-upload-queue', this.sourceId);
  }
  action(request: ActionRequest): Promise<void> {
    return this.session.rpc.$call('powersync:page-action', this.sourceId, request);
  }
  /** Events arrive as `page-event` pushes and are routed by the registry; nothing to subscribe here. */
  async observeEvents(): Promise<Unsubscribe> {
    return () => {};
  }
  async close(): Promise<void> {}
}

const sources = new Map<string, Source>();
/** UI sessions that asked for events, keyed by session id. */
const observers = new Map<number, DevframeNodeRpcSession>();
/** The id a page serves a database under, per session, to the id it is listed under here. */
const pageSources = new Map<string, string>();
/** Runs while UIs observe, so a page that went away is dropped and announced without waiting for a call. */
let sweep: ReturnType<typeof setInterval> | undefined;
const SWEEP_INTERVAL_MS = 2000;
const STALE_AFTER_MS = HEARTBEAT_MS * 3;

function pageKey(session: DevframeNodeRpcSession, pageSourceId: string): string {
  return `${session.meta.id}:${pageSourceId}`;
}

function pageAlive(remote: RemoteIntegration, source: () => Source | undefined): boolean {
  if (remote.closed) return false;
  const lastSeen = source()?.lastSeen;
  return lastSeen == null || Date.now() - lastSeen < STALE_AFTER_MS;
}

/** Every page numbers its databases from 1, so a second page announcing `web-1` is listed as `web-2`. */
function allocateSourceId(pageSourceId: string): string {
  const stem = pageSourceId.replace(/-\d+$/, '');
  for (let number = 1; ; number++) {
    const candidate = `${stem}-${number}`;
    const taken = sources.get(candidate);
    if (!taken || !taken.alive()) return candidate;
  }
}

function sourceInfos(): SourceInfo[] {
  return [...sources.values()].filter((source) => source.alive()).map((source) => ({ id: source.id, sdk: source.sdk }));
}

function liveSources(): Source[] {
  for (const [id, source] of sources) {
    if (!source.alive()) {
      removeSource(id);
    }
  }
  return [...sources.values()];
}

function notifySources(): void {
  const list = sourceInfos();
  for (const [sessionId, session] of observers) {
    if (session.rpc.$closed) {
      observers.delete(sessionId);
      continue;
    }
    void session.rpc.$callEvent('powersync:sources-changed', list);
  }
}

function ensureSweep(): void {
  if (sweep) return;
  sweep = setInterval(() => {
    liveSources();
    if (observers.size === 0 && sweep) {
      clearInterval(sweep);
      sweep = undefined;
    }
  }, SWEEP_INTERVAL_MS);
  sweep.unref?.();
}

function pickSource(sourceId?: string | null): Source {
  const live = liveSources();
  const source = sourceId ? live.find((candidate) => candidate.id === sourceId) : live[0];
  if (!source) {
    throw new Error(
      sourceId
        ? `No PowerSync database "${sourceId}" is attached.`
        : 'No PowerSync database is attached. Open the app in a trusted browser tab, or call enablePowerSyncDiagnostics() in the node app.'
    );
  }
  return source;
}

function pushEvent(session: DevframeNodeRpcSession, sourceId: string, event: DiagnosticsEvent): void {
  void session.rpc.$callEvent('powersync:event', sourceId, event);
}

function fanOut(sourceId: string, event: DiagnosticsEvent): void {
  const source = sources.get(sourceId);
  if (!source) return;
  if (SNAPSHOT_TYPES.has(event.type)) {
    source.snapshots.set(event.type, event);
  }
  for (const [sessionId, session] of observers) {
    if (session.rpc.$closed) {
      observers.delete(sessionId);
      continue;
    }
    pushEvent(session, sourceId, event);
  }
}

function addSource(source: Source): void {
  sources.get(source.id)?.stop?.();
  sources.set(source.id, source);
  console.info(`[powersync-diagnostics] source attached: ${source.id} (${source.sdk ?? 'unknown sdk'})`);
  notifySources();
}

function removeSource(sourceId: string): void {
  const source = sources.get(sourceId);
  if (!source) return;
  source.stop?.();
  sources.delete(sourceId);
  for (const [key, id] of pageSources) {
    if (id === sourceId) pageSources.delete(key);
  }
  console.info(`[powersync-diagnostics] source detached: ${sourceId}`);
  notifySources();
}

/**
 * Serves an integration that lives in this process (a node app's database). Events are pulled from
 * it directly. Returns a function that detaches it.
 */
export async function registerIntegration(
  id: string,
  integration: SdkIntegration,
  sdk: string | null = null
): Promise<Unsubscribe> {
  const source: Source = { id, sdk, integration, alive: () => true, lastSeen: null, snapshots: new Map() };
  addSource(source);
  source.stop = await integration.observeEvents((event) => fanOut(id, event));
  return () => removeSource(id);
}

/** The built diagnostics UI (`@powersync/diagnostics-ui/dist/standalone`), served as the dock page. */
export function uiDistDir(): string {
  const require = createRequire(import.meta.url);
  const pkg = require.resolve('@powersync/diagnostics-ui/package.json');
  return join(dirname(pkg), 'dist', 'standalone');
}

const packageJson = createRequire(import.meta.url)('../../package.json') as { version: string; name: string };

// --- argument schemas (Standard Schema through zod): validated on the wire and shown to agents ---
// Agents see positional arguments as `arg0`, `arg1`, ... and every one is advertised as required, so
// each description spells out that convention and which values may be null.

const sourceIdArg = z
  .string()
  .nullable()
  .optional()
  .describe('Id of the attached database, from powersync_sources. Null for the first one.');
const queryParamsArg = z
  .object({
    sql: z.string().describe('SQL to run against the local SQLite database.'),
    params: z.array(z.unknown()).optional().describe('Positional parameters for `?` placeholders.')
  })
  .describe('The query.');
const actionRequestArg = z
  .object({
    action: z.enum([
      'reconnect',
      'disconnect',
      'clearData',
      'requestCheckpoint',
      'subscribeStream',
      'unsubscribeStream'
    ]),
    args: z
      .object({
        name: z.string(),
        params: z.record(z.string(), z.unknown()).optional(),
        ttl: z.number().optional(),
        priority: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional()
      })
      .optional()
      .describe('Stream name and options, for the stream actions only.')
  })
  .describe('The action to run.');
const anyResult = z.unknown();

export const definition = defineDevframe({
  id: DEVFRAME_ID,
  name: 'PowerSync',
  version: packageJson.version,
  packageName: packageJson.name,
  importMetaUrl: import.meta.url,
  homepage: 'https://docs.powersync.com',
  description: 'Live diagnostics for the PowerSync client: sync status, buckets, streams, local data, schema and logs.',
  // The PowerSync mark, shipped with the UI and served under the mount base.
  icon: `${UI_ROUTE}powersync-icon.svg`,
  clientAssets: uiDistDir(),
  dock: {
    category: 'app',
    clientScript: {
      // Runs in the app page: finds the live database and serves it to this node side.
      importFrom: `${packageJson.name}/client`,
      eager: true
    }
  },
  setup(ctx: DevframeNodeContext) {
    const ps = ctx.scope(DEVFRAME_ID);
    const currentSession = () => {
      const session = ctx.rpc.getCurrentRpcSession();
      if (!session) throw new Error('No RPC session for this call.');
      return session;
    };

    // --- page / app facing: a connected client serves a database ---
    ps.rpc.register(
      defineRpcFunction({
        name: 'page-register',
        type: 'action',
        jsonSerializable: true,
        handler: (pageSourceId: string, sdk: string | null) => {
          const session = currentSession();
          const id = allocateSourceId(pageSourceId);
          pageSources.set(pageKey(session, pageSourceId), id);
          const remote = new RemoteIntegration(session, pageSourceId);
          addSource({
            id,
            sdk,
            integration: remote,
            alive: () => pageAlive(remote, () => sources.get(id)),
            lastSeen: Date.now(),
            snapshots: new Map()
          });
        }
      })
    );
    ps.rpc.register(
      defineRpcFunction({
        name: 'page-heartbeat',
        type: 'event',
        jsonSerializable: true,
        handler: (pageSourceId: string) => {
          const id = pageSources.get(pageKey(currentSession(), pageSourceId));
          const source = id ? sources.get(id) : undefined;
          if (source) source.lastSeen = Date.now();
        }
      })
    );
    ps.rpc.register(
      defineRpcFunction({
        name: 'page-unregister',
        type: 'action',
        jsonSerializable: true,
        handler: (pageSourceId: string) => {
          const id = pageSources.get(pageKey(currentSession(), pageSourceId));
          if (id) removeSource(id);
        }
      })
    );
    ps.rpc.register(
      defineRpcFunction({
        name: 'page-event',
        type: 'event',
        jsonSerializable: true,
        handler: (pageSourceId: string, event: DiagnosticsEvent) => {
          const id = pageSources.get(pageKey(currentSession(), pageSourceId));
          if (id) fanOut(id, event);
        }
      })
    );

    // --- UI and agent facing: SdkIntegration, one function per method ---
    ps.rpc.register(
      defineRpcFunction({
        name: 'sources',
        type: 'query',
        jsonSerializable: true,
        agent: { description: 'List the PowerSync databases attached to this dev server, with their ids and SDKs.' },
        handler: (): SourceInfo[] => {
          liveSources();
          return sourceInfos();
        }
      })
    );
    ps.rpc.register(
      defineRpcFunction({
        name: 'query',
        type: 'action',
        jsonSerializable: true,
        args: [queryParamsArg, sourceIdArg],
        returns: anyResult,
        agent: {
          description:
            'Run SQL against the attached PowerSync SQLite database. App tables are views; the sync client state is in the ps_* tables (ps_buckets, ps_oplog, ps_crud, ps_stream_subscriptions). Returns columns and rows. Arguments: arg0 = { sql, params? }, arg1 = database id or null for the first one.',
          safety: 'action'
        },
        handler: (params, sourceId) => pickSource(sourceId).integration.runQuery(params as QueryParams)
      })
    );
    ps.rpc.register(
      defineRpcFunction({
        name: 'schema',
        type: 'query',
        jsonSerializable: true,
        args: [sourceIdArg],
        returns: anyResult,
        agent: {
          description:
            'The client schema as the PowerSync SQLite core receives it: tables, columns, indexes. Argument: arg0 = database id or null for the first one.'
        },
        handler: (sourceId) => pickSource(sourceId).integration.getSchema()
      })
    );
    ps.rpc.register(
      defineRpcFunction({
        name: 'info',
        type: 'query',
        jsonSerializable: true,
        args: [sourceIdArg],
        returns: anyResult,
        agent: {
          description:
            'Connection info of the PowerSync client: endpoint, user id, client id, connection method, core version. Argument: arg0 = database id or null for the first one.'
        },
        handler: (sourceId) => pickSource(sourceId).integration.getInfo()
      })
    );
    ps.rpc.register(
      defineRpcFunction({
        name: 'status',
        type: 'query',
        jsonSerializable: true,
        args: [sourceIdArg],
        returns: anyResult,
        agent: {
          description:
            'The current sync status of the PowerSync client: connected, downloading, progress, last sync, errors. Argument: arg0 = database id or null for the first one.'
        },
        handler: (sourceId) => pickSource(sourceId).integration.currentSyncStatus()
      })
    );
    ps.rpc.register(
      defineRpcFunction({
        name: 'upload-queue',
        type: 'query',
        jsonSerializable: true,
        args: [sourceIdArg],
        returns: anyResult,
        agent: {
          description:
            'Pending local changes waiting to upload: count and size. Argument: arg0 = database id or null for the first one.'
        },
        handler: (sourceId) => pickSource(sourceId).integration.getUploadQueueStats()
      })
    );
    ps.rpc.register(
      defineRpcFunction({
        name: 'action',
        type: 'action',
        jsonSerializable: true,
        args: [actionRequestArg, sourceIdArg],
        returns: anyResult,
        agent: {
          description:
            'Run a control action on the PowerSync client: reconnect, disconnect, clearData (wipes local data and re-syncs), requestCheckpoint, subscribeStream, unsubscribeStream. Arguments: arg0 = { action, args? }, arg1 = database id or null for the first one.',
          safety: 'destructive'
        },
        handler: (request, sourceId) => pickSource(sourceId).integration.action(request as ActionRequest)
      })
    );

    // --- UI facing: pushed events ---
    ps.rpc.register(
      defineRpcFunction({
        name: 'observe',
        type: 'action',
        jsonSerializable: true,
        handler: (sourceId?: string | null) => {
          const session = currentSession();
          observers.set(session.meta.id, session);
          ensureSweep();
          const live = liveSources();
          // The list first, so the UI knows which database the snapshots that follow belong to.
          void session.rpc.$callEvent('powersync:sources-changed', sourceInfos());
          const source = sourceId ? live.find((candidate) => candidate.id === sourceId) : live[0];
          if (!source) return;
          for (const event of source.snapshots.values()) {
            pushEvent(session, source.id, event);
          }
        }
      })
    );
    ps.rpc.register(
      defineRpcFunction({
        name: 'unobserve',
        type: 'action',
        jsonSerializable: true,
        handler: () => {
          observers.delete(currentSession().meta.id);
        }
      })
    );
  }
});
