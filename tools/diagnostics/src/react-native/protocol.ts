/**
 * The contract between the app side (`usePowerSyncDevTools`) and the DevTools panel, carried over a
 * Rozenite plugin channel. Calls go over Rozenite RPC; pushed events go as plain plugin messages.
 */
import type {
  ActionRequest,
  DiagnosticsEvent,
  ProtocolInfo,
  QueryParams,
  QueryResult,
  SchemaPayload
} from '@powersync/diagnostics-core';

/** The Rozenite plugin id. Rozenite finds the plugin by this package name. */
export const PLUGIN_ID = '@powersync/diagnostics';

/** The message type that carries one {@link DiagnosticsEvent} from the app to the panel. */
export const EVENT_MESSAGE = 'powersync:event';

/** Plugin messages, keyed by type. */
export type DevToolsEventMap = {
  [EVENT_MESSAGE]: DiagnosticsEvent;
};

/** Methods the app serves to the panel. */
export type AppMethods = {
  runQuery: (params: QueryParams) => Promise<QueryResult>;
  getSchema: () => Promise<SchemaPayload>;
  getInfo: () => Promise<ProtocolInfo>;
  action: (request: ActionRequest) => Promise<void>;
  /** Starts (or restarts) the event stream; the app pushes the current snapshots first. */
  subscribe: () => Promise<void>;
};
