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
   *
   * The default value is SDK-specific. {@link SyncStreamConnectionMethod.HTTP} is the preferred implementation and used
   * by default, except for React Native apps without Expo. Those don't support streaming HTTP responses, which is why
   * {@link SyncStreamConnectionMethod.WEB_SOCKET} is used as a workaround.
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

  /**
   * The mode used to request checkpoints from the service (used after uploading local data).
   */
  checkpointMode?: CheckpointMode;
}

/**
 * @public
 */
export enum SyncStreamConnectionMethod {
  HTTP = 'http',
  WEB_SOCKET = 'web-socket'
}

/**
 * @public
 */
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

/**
 * The mechanism to request checkpoints from the PowerSync service.
 *
 * Checkpoint requests are used after a client uploads local mutations. The PowerSync service later references them in
 * downloaded data, allowing the SDK to assume that uploaded data has been synced down again.
 *
 * There are two ways to send checkpoint requests: A legacy (but default and stable) format supported by all PowerSync
 * service versions, and a newer (`requests`) method which is only available from PowerSync service version 1.24.0 or
 * later.
 *
 * Note that the requests checkpoint mode is an alpha API.
 *
 * @public
 */
export type CheckpointMode = 'legacy' | 'requests' | { requests: CheckpointRequestsOptions };

/**
 * Options associated with a {@link CheckpointMode} when the requests-based checkpoint option is used.
 *
 * @alpha
 */
export interface CheckpointRequestsOptions {
  retryDelay: number;
}
