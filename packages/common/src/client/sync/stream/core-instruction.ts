import { StreamingSyncRequest } from './streaming-sync-types.js';

/**
 * An internal instruction received by the sync client in the core extension in response to the JS
 * SDK passing sync data into the extension.
 */
export type Instruction =
  | { LogLine: LogLine }
  | { UpdateSyncStatus: UpdateSyncStatus }
  | { EstablishSyncStream: EstablishSyncStream }
  | { FetchCredentials: FetchCredentials }
  | { CloseSyncStream: any }
  | { FlushFileSystem: any }
  | { DidCompleteSync: any };

export interface LogLine {
  severity: 'DEBUG' | 'INFO' | 'WARNING';
  line: string;
}

export interface EstablishSyncStream {
  request: StreamingSyncRequest;
}

export interface UpdateSyncStatus {
  status: CoreSyncStatus;
}

export interface CoreSyncStatus {
  connected: boolean;
  connecting: boolean;
  priority_status: SyncPriorityStatus[];
  downloading: DownloadProgress | null;
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
