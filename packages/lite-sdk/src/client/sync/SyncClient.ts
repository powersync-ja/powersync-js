import type { BucketRequest, Checkpoint, StreamingSyncLine } from '@powersync/service-core';
import { BaseListener, BaseObserverInterface, Disposable } from '../../utils/BaseObserver.js';
import type { BucketStorage } from '../storage/BucketStorage.js';
import type { SystemDependencies } from '../system/SystemDependencies.js';
import { Connector } from './Connector.js';
import { CrudManager } from './CrudManager.js';

/**
 * Current synchronization status of the sync client.
 * Provides real-time information about connection state and any errors.
 */
export interface SyncStatus {
  /** Whether the client is currently connected to the PowerSync service. */
  connected: boolean;
  /** Whether the client is currently attempting to connect. */
  connecting: boolean;
  /** The last time the client synced data from the PowerSync service. */
  lastSyncedAt: Date | null;
  /** Whether the client has synced all data from the PowerSync service. */
  hasSynced: boolean;
  /** Whether data is currently being downloaded from the service. */
  downloading: boolean;
  /** Whether data is currently being uploaded to the service. */
  uploading: boolean;
  /** Error that occurred during download, if any. */
  downloadError: Error | null;
  /** Error that occurred during upload, if any. */
  uploadError: Error | null;
}

/**
 * Listener interface for sync client status changes.
 */
export interface SyncClientListener extends BaseListener {
  /**
   * Triggers whenever the status' members have changed in value
   */
  statusChanged?: ((status: SyncStatus) => void) | undefined;
  /**
   * Triggers whenever a checkpoint is completed.
   * @param checkpoint - The checkpoint that was completed
   */
  checkpointCompleted?: ((checkpoint: Checkpoint) => void) | undefined;
}

export type CreateCheckpointResponse = {
  targetUpdated: boolean;
  targetCheckpoint?: string;
  waitForValidation: (signal?: AbortSignal) => Promise<void>;
};

/**
 * Main interface for synchronizing data with a PowerSync service.
 * Handles bidirectional sync, connection management, and status tracking.
 */
export interface SyncClient extends BaseObserverInterface<SyncClientListener>, Disposable {
  /** Current synchronization status. */
  readonly status: SyncStatus;

  /**
   * Establishes a connection to the PowerSync service and begins syncing.
   * The connection will automatically retry on failure using the configured retry delay.
   * @param connector Provides credentials for authentication. Can be called multiple times
   *                  to refresh credentials as needed.
   * @returns A promise that resolves when the connection process starts. The promise may
   *          not resolve if the connection is maintained indefinitely.
   */
  connect: (connector: Connector) => Promise<void>;

  /**
   * Disconnects from the PowerSync service and stops all sync operations.
   * Any ongoing sync operations will be aborted.
   */
  disconnect: () => void;

  /**
   * Sets the target write checkpoint.
   * @param customCheckpoint - Optional custom checkpoint to set the target to
   * defaults to creating a managed PowerSync checkpoint
   *
   * FIXME
   * This is a no-op if there are pending CRUD items.
   * This does not answer the generic question "have I synced to this point in time?"
   * It answers the question "have I synced to after uploads have been completed?"
   */
  checkpoint: (customCheckpoint?: string) => Promise<CreateCheckpointResponse>;

  /**
   * Triggers a CRUD upload.
   * This will perform an upload of the CRUD items if there are any.
   * If there are no CRUD items, it will do nothing.
   * If there are CRUD items, the {@link CrudManager} will be used to perform the upload.
   */
  triggerCrudUpload: () => void;
}

export type StreamOptions = {
  endpoint: string;
  token: string;
  clientId: string | undefined;
  signal: AbortSignal | undefined;
  bucketPositions: BucketRequest[];
  systemDependencies: SystemDependencies;
};

/**
 * Function type for opening a sync stream. Can be overridden in tests.
 */
export type StreamOpener = (options: StreamOptions) => Promise<ReadableStream<StreamingSyncLine>>;

/**
 * Configuration options for creating a SyncClient instance.
 */
export type SyncClientOptions = {
  /** Manager for CRUD operations. */
  crudManager?: CrudManager;
  /** Delay in milliseconds before retrying a failed connection attempt. */
  connectionRetryDelayMs: number;
  /** Delay in milliseconds before retrying a failed upload operation. */
  uploadThrottleMs: number;
  /** Whether to enable debug logging for sync operations. */
  debugMode?: boolean;
  /** Storage implementation for managing bucket data and synchronization state. */
  storage: BucketStorage;
  /** System-level dependencies (HTTP client, timers, etc.) required for sync operations. */
  systemDependencies: SystemDependencies;
  /** Optional function to open a sync stream. Defaults to openHttpStream. Used for testing. */
  streamOpener?: StreamOpener;
};
