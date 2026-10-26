import { StreamSubscriptionRequest } from './requests.js';
import { StreamingSyncKeepalive } from './sync_protocol.js';

export interface DownloadChanges {
  updatedRows: Map<string, Map<string, Record<string, unknown> | null>>;
}

export type DownloadEvent =
  // Response resolved, can mark as connected.
  | { type: 'headersReceived' }
  // Local materialized rows have changed.
  | { type: 'rows'; changes: DownloadChanges }
  // Could not apply server-side changes due to local data that has not yet been uploaded.
  | { type: 'blockedDueToLocalData' }
  // Could not apply server-side changes due to local mutations that have been uploaded, but not acknowledged yet.
  | { type: 'waitingForCheckpoint'; target: bigint; received: bigint | null | undefined }
  // Received a periodic keepalive notification from the service.
  | { type: 'keepalive'; keepalive: StreamingSyncKeepalive };

export interface ServiceRequest {
  /**
   * The PowerSync Service to connect to.
   */
  endpoint: string;

  /**
   * The authentication token to use for the request.
   */
  token: string;

  /**
   * A random client id.
   */
  clientId: string;

  /**
   * An optional abort signal to abort the request.
   */
  signal?: AbortSignal;
}

/**
 * Requests a checkpoint from the PowerSync service.
 */
export interface CheckpointRequest extends ServiceRequest {
  /** The local checkpoint number to reconcile with the service. */
  checkpoint: bigint;
}

export interface SyncRequest extends ServiceRequest {
  parameters?: Record<string, unknown>;
  streams?: StreamSubscriptionRequest;
  metadata?: Record<string, string>;
}

export class UnexpectedResponseError extends Error {
  constructor(
    readonly statusCode: number,
    readonly body: string
  ) {
    super(`Unexpected response from PowerSync service: ${statusCode}`);
  }
}

export class RestartSyncError extends Error {
  constructor(
    message: string,
    readonly clearLocal = false
  ) {
    super(message);
  }
}
