import type { ProgressWithOperations, SyncPriorityStatus, SyncStatus, SyncStreamStatus } from '@powersync/common';
import type { PriorityState, ProgressState, StreamState, SyncState } from '@powersync/diagnostics-core';

/** Maps the SDK's live sync status onto the plain, serializable protocol shapes. */

function toProgress(progress: ProgressWithOperations | null | undefined): ProgressState | null {
  if (!progress) {
    return null;
  }
  return {
    downloadedOperations: progress.downloadedOperations,
    totalOperations: progress.totalOperations
  };
}

function toEpoch(date: Date | null | undefined): number | null {
  return date ? date.getTime() : null;
}

function errorText(error: { message?: string } | null | undefined): string | null {
  return error ? String(error.message ?? error) : null;
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
    downloadError: errorText(status.downloadError),
    uploadError: errorText(status.uploadError)
  };
}

export function toStreamStates(status: SyncStatus): StreamState[] {
  return (status.syncStreams ?? []).map((stream: SyncStreamStatus) => {
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
