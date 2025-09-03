import { StreamingSyncRequest } from './streaming-sync-types.js';
import * as sync_status from '../../../db/crud/SyncStatus.js';
import { FULL_SYNC_PRIORITY } from '../../../db/crud/SyncProgress.js';

/**
 * An internal instruction emitted by the sync client in the core extension in response to the JS
 * SDK passing sync data into the extension.
 */
export type Instruction =
  | { LogLine: LogLine }
  | { UpdateSyncStatus: UpdateSyncStatus }
  | { EstablishSyncStream: EstablishSyncStream }
  | { FetchCredentials: FetchCredentials }
  | { CloseSyncStream: { hide_disconnect: boolean } }
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

function priorityToJs(status: SyncPriorityStatus): sync_status.SyncPriorityStatus {
  return {
    priority: status.priority,
    hasSynced: status.has_synced ?? undefined,
    lastSyncedAt: status?.last_synced_at != null ? new Date(status!.last_synced_at! * 1000) : undefined
  };
}

export function coreStatusToJs(status: CoreSyncStatus): sync_status.SyncStatusOptions {
  const coreCompleteSync = status.priority_status.find((s) => s.priority == FULL_SYNC_PRIORITY);
  const completeSync = coreCompleteSync != null ? priorityToJs(coreCompleteSync) : null;

  return {
    connected: status.connected,
    connecting: status.connecting,
    dataFlow: {
      downloading: status.downloading != null,
      downloadProgress: status.downloading?.buckets
    },
    lastSyncedAt: completeSync?.lastSyncedAt,
    hasSynced: completeSync?.hasSynced,
    priorityStatusEntries: status.priority_status.map(priorityToJs)
  };
}
