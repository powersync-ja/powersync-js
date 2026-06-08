import { StreamingSyncRequestParameterType } from './stream/JsonValue.js';

/**
 * Options that affect how the PowerSync SDK connects to the PowerSync Service.
 *
 * @public
 */
export interface SyncOptions {
  // Note: When adding new fields to this interface, consider that these objects need to be serializable.

  /**
   * A set of metadata to be included in service logs.
   */
  appMetadata?: Record<string, string>;

  /**
   * These parameters are passed to the sync rules, and will be available under the`user_parameters` object.
   */
  params?: Record<string, StreamingSyncRequestParameterType>;

  /**
   * The connection method to use when streaming updates from
   * the PowerSync backend instance.
   * Defaults to a HTTP streaming connection.
   */
  connectionMethod?: SyncStreamConnectionMethod;

  fetchStrategy?: FetchStrategy;

  /**
   * Whether to include streams that have `auto_subscribe: true` in their definition.
   *
   * This defaults to `true`.
   */
  includeDefaultStreams?: boolean;

  /**
   * Delay for retrying sync streaming operations
   * from the PowerSync backend after an error occurs.
   */
  retryDelayMs?: number;

  /**
   * Backend Connector CRUD operations are throttled
   * to occur at most every `crudUploadThrottleMs`
   * milliseconds.
   */
  crudUploadThrottleMs?: number;
}

/**
 * @internal
 */
export type ResolvedSyncOptions = Required<SyncOptions>;

/**
 * @internal
 */
export function resolveSyncOptions(options: SyncOptions): ResolvedSyncOptions {
  return {
    appMetadata: options.appMetadata ?? {},
    connectionMethod: options.connectionMethod ?? SyncStreamConnectionMethod.HTTP,
    fetchStrategy: options.fetchStrategy ?? FetchStrategy.Buffered,
    params: options.params ?? {},
    includeDefaultStreams: options.includeDefaultStreams ?? true,
    retryDelayMs: options.retryDelayMs ?? 5000,
    crudUploadThrottleMs: options.crudUploadThrottleMs ?? 1000
  };
}

// TODO: This should not be part of SyncOptions. Remove the WebSocket options from @powersync/common into a separate
// package and make this an option only available when creating a custom remote.
export enum SyncStreamConnectionMethod {
  HTTP = 'http',
  WEB_SOCKET = 'web-socket'
}

export enum FetchStrategy {
  /**
   * Queues multiple sync events before processing, reducing round-trips.
   * This comes at the cost of more processing overhead, which may cause ACK timeouts on older/weaker devices for big enough datasets.
   */
  Buffered = 'buffered',

  /**
   * Processes each sync event immediately before requesting the next.
   * This reduces processing overhead and improves real-time responsiveness.
   */
  Sequential = 'sequential'
}
