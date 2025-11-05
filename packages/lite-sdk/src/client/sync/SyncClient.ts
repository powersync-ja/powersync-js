import type { BucketRequest, StreamingSyncLine } from '@powersync/service-core';
import { BaseListener, BaseObserverInterface, Disposable } from '../../utils/BaseObserver.js';
import type { BucketStorage } from '../storage/BucketStorage.js';
import type { SystemDependencies } from '../system/SystemDependencies.js';

/**
 * Credentials required to connect to a PowerSync instance.
 */
export type PowerSyncCredentials = {
  /** The PowerSync endpoint URL to connect to. */
  endpoint: string;
  /** Authentication token for the PowerSync service. */
  token: string;
};

/**
 * Provides credentials dynamically for PowerSync connections.
 * This allows for credential refresh and token rotation without
 * disconnecting the client.
 */
export type Connector = {
  /**
   * Fetches the current PowerSync credentials.
   * @returns A promise that resolves to credentials, or null if no credentials are available.
   */
  fetchCredentials: () => Promise<PowerSyncCredentials | null>;
};

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
  /** Error that occurred during download, if any. */
  downloadError: Error | null;
}

/**
 * Listener interface for sync client status changes.
 */
export interface SyncClientListener extends BaseListener {
  /**
   * Triggers whenever the status' members have changed in value
   */
  statusChanged?: ((status: SyncStatus) => void) | undefined;
}

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
  /** Delay in milliseconds before retrying a failed connection attempt. */
  connectionRetryDelayMs: number;
  /** Delay in milliseconds before retrying a failed upload operation. */
  uploadRetryDelayMs: number;
  /** Whether to enable debug logging for sync operations. */
  debugMode?: boolean;
  /** Storage implementation for managing bucket data and synchronization state. */
  storage: BucketStorage;
  /** System-level dependencies (HTTP client, timers, etc.) required for sync operations. */
  systemDependencies: SystemDependencies;
  /** Optional function to open a sync stream. Defaults to openHttpStream. Used for testing. */
  streamOpener?: StreamOpener;
};
