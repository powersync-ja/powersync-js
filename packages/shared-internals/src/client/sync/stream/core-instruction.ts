/**
 * An internal instruction emitted by the sync client in the core extension in response to the JS
 * SDK passing sync data into the extension.
 */
export type Instruction = InterruptingInstruction | NonInterruptingInstruction;

export type InterruptingInstruction =
  | { EstablishSyncStream: EstablishSyncStream }
  | { CloseSyncStream: { hide_disconnect: boolean } };

/**
 * An {@link Instruction} that doesn't start or stop a sync iteration.
 */
export type NonInterruptingInstruction =
  | { LogLine: LogLine }
  | { UpdateSyncStatus: UpdateSyncStatus }
  | { FetchCredentials: FetchCredentials }
  | { FlushFileSystem: any }
  | { DidCompleteSync: any }
  | { HandleDiagnostics: DiagnosticsEvent };

/**
 * Emitted by the core extension when diagnostics are enabled on the sync stream (see
 * {@link https://github.com/powersync-ja/powersync-sqlite-core diagnostics}). Reports detailed
 * per-bucket download state — including the per-bucket `target_count` that is otherwise internal to
 * the core — and inferred column types as data is downloaded.
 */
export type DiagnosticsEvent =
  | { BucketStateChange: { changes: BucketDownloadState[]; incremental: boolean } }
  | { SchemaChange: ObservedSchemaColumn };

export interface BucketDownloadState {
  name: string;
  progress: BucketProgress;
}

export interface ObservedSchemaColumn {
  table: string;
  column: string;
  value_type: 'Null' | 'String' | 'Integer' | 'Real';
}

export interface LogLine {
  severity: 'DEBUG' | 'INFO' | 'WARNING';
  line: string;
}

export interface EstablishSyncStream {
  request: unknown;
  checkpoint_request?: CheckpointRequestPayload;
}

export interface UpdateSyncStatus {
  status: CoreSyncStatus;
}

export interface CoreSyncStatus {
  connected: boolean;
  connecting: boolean;
  priority_status: SyncPriorityStatus[];
  downloading: DownloadProgress | null;
  streams: CoreStreamSubscription[];
  internal_last_applied_checkpoint_request_id?: string;
}

/// An `ActiveStreamSubscription` from the core extension + serialized progress information.
export interface CoreStreamSubscription {
  progress: { total: number; downloaded: number };
  name: string;
  parameters: any;
  priority: number | null;
  active: boolean;
  is_default: boolean;
  has_explicit_subscription: boolean;
  expires_at: number | null;
  last_synced_at: number | null;
}

export interface SyncPriorityStatus {
  priority: number;
  last_synced_at: number | number;
  has_synced: boolean | null;
}

export interface DownloadProgress {
  buckets: Record<string, BucketProgress>;
}

export interface BucketProgress {
  priority: number;
  at_last: number;
  since_last: number;
  target_count: number;
}

export interface FetchCredentials {
  did_expire: boolean;
}

export interface CheckpointRequestPayload {
  client_id: string;
  checkpoint_request_id: string;
}

export function isInterruptingInstruction(instruction: Instruction): instruction is InterruptingInstruction {
  return 'EstablishSyncStream' in instruction || 'CloseSyncStream' in instruction;
}
