/**
 * The RPC functions this package registers on both sides of a devframe connection, declared once so
 * every `rpc.call` / `session.rpc.$call` is type-checked against the same contract. devframe types
 * calls against these two registries; augmenting them is the documented way to add functions.
 */
import type {
  ActionRequest,
  DiagnosticsEvent,
  ProtocolInfo,
  QueryParams,
  QueryResult,
  SchemaPayload,
  SyncState,
  UploadQueueState
} from '@powersync/diagnostics-core';

/** A database served through the node side. */
export interface SourceInfo {
  id: string;
  /** A label for the SDK behind it, e.g. `@powersync/web`. */
  sdk: string | null;
}

declare module 'devframe/types' {
  /** Functions the node side serves; called by the UI, by agents over MCP, and by pages announcing a database. */
  interface DevframeRpcServerFunctions {
    'powersync:sources': () => SourceInfo[];
    'powersync:query': (params: QueryParams, sourceId?: string | null) => Promise<QueryResult>;
    'powersync:schema': (sourceId?: string | null) => Promise<SchemaPayload>;
    'powersync:info': (sourceId?: string | null) => Promise<ProtocolInfo>;
    'powersync:status': (sourceId?: string | null) => Promise<SyncState | null>;
    'powersync:upload-queue': (sourceId?: string | null) => Promise<UploadQueueState | null>;
    'powersync:action': (request: ActionRequest, sourceId?: string | null) => Promise<void>;
    'powersync:observe': (sourceId?: string | null) => void;
    'powersync:unobserve': () => void;
    'powersync:page-register': (sourceId: string, sdk: string | null) => void;
    'powersync:page-unregister': (sourceId: string) => void;
    'powersync:page-heartbeat': (sourceId: string) => void;
    'powersync:page-event': (sourceId: string, event: DiagnosticsEvent) => void;
  }

  /** Functions a connected page or app serves; called by the node side on the session that announced the database. */
  interface DevframeRpcClientFunctions {
    'powersync:event': (sourceId: string, event: DiagnosticsEvent) => void;
    'powersync:sources-changed': (sources: SourceInfo[]) => void;
    'powersync:page-query': (sourceId: string, params: QueryParams) => Promise<QueryResult>;
    'powersync:page-schema': (sourceId: string) => Promise<SchemaPayload>;
    'powersync:page-info': (sourceId: string) => Promise<ProtocolInfo>;
    'powersync:page-action': (sourceId: string, request: ActionRequest) => Promise<void>;
  }
}
