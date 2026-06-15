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
  | { DidCompleteSync: any };

export interface LogLine {
  severity: 'DEBUG' | 'INFO' | 'WARNING';
  line: string;
}

export interface EstablishSyncStream {
  request: unknown;
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

export function isInterruptingInstruction(instruction: Instruction): instruction is InterruptingInstruction {
  return 'EstablishSyncStream' in instruction || 'CloseSyncStream' in instruction;
}
