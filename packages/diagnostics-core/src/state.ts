import type { LiveProgress, LivePriorityStatus, LiveStreamStatus, LiveSyncStatus } from './live-database.js';
import type { PriorityState, ProgressState, StreamState, SyncState } from './shapes.js';

/** Maps the live SDK sync status into plain, serializable protocol state. */

function toProgress(progress: LiveProgress | null | undefined): ProgressState | null {
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

function errorText(error: { message?: string } | null | undefined): string | null {
  return error ? String(error.message ?? error) : null;
}

export function toSyncState(status: LiveSyncStatus): SyncState {
  const priorities: PriorityState[] = (status.priorityStatusEntries ?? []).map((entry: LivePriorityStatus) => ({
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
    downloadError: errorText(status.downloadError),
    uploadError: errorText(status.uploadError),
    message: status.getMessage()
  };
}

export function toStreamStates(status: LiveSyncStatus): StreamState[] {
  return (status.syncStreams ?? []).map((stream: LiveStreamStatus) => {
    const subscription = stream.subscription;
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
