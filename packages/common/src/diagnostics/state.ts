import type { SyncSubscriptionDescription } from '../client/sync/sync-streams.js';
import type { ProgressWithOperations } from '../db/crud/SyncProgress.js';
import type { SyncPriorityStatus, SyncStatus, SyncStreamStatus } from '../db/crud/SyncStatus.js';
import { PriorityState, ProgressState, StreamState, SyncState } from './protocol.js';

/** Maps the live SDK sync status into plain, serializable state the transport can carry. */

function toProgress(progress: ProgressWithOperations | null | undefined): ProgressState | null {
  if (!progress) {
    return null;
  }
  return {
    downloadedOperations: progress.downloadedOperations,
    totalOperations: progress.totalOperations,
    downloadedFraction: progress.downloadedFraction
  };
}

function toEpoch(date: Date | null | undefined): number | null {
  return date ? date.getTime() : null;
}

export function toSyncState(status: SyncStatus): SyncState {
  const priorities: PriorityState[] = (status.priorityStatusEntries ?? []).map((entry: SyncPriorityStatus) => ({
    priority: entry.priority,
    lastSyncedAt: toEpoch(entry.lastSyncedAt),
    hasSynced: entry.hasSynced ?? null
  }));

  return {
    connected: status.connected,
    connecting: status.connecting,
    downloading: status.downloading,
    uploading: status.uploading,
    hasSynced: status.hasSynced ?? null,
    lastSyncedAt: toEpoch(status.lastSyncedAt),
    downloadProgress: toProgress(status.downloadProgress),
    priorities,
    downloadError: status.downloadError ? String(status.downloadError.message ?? status.downloadError) : null,
    uploadError: status.uploadError ? String(status.uploadError.message ?? status.uploadError) : null,
    message: status.getMessage()
  };
}

export function toStreamStates(status: SyncStatus): StreamState[] {
  return (status.syncStreams ?? []).map((stream: SyncStreamStatus) => {
    const subscription: SyncSubscriptionDescription = stream.subscription;
    return {
      name: subscription.name,
      priority: stream.priority,
      active: subscription.active,
      autoSubscribed: subscription.isDefault,
      explicitlySubscribed: subscription.hasExplicitSubscription,
      progress: toProgress(stream.progress),
      params: subscription.parameters,
      expiresAt: toEpoch(subscription.expiresAt),
      hasSynced: subscription.hasSynced,
      lastSyncedAt: toEpoch(subscription.lastSyncedAt)
    };
  });
}
