'use client';

export type { SyncStatus } from './client.js';

import { useSyncExternalStore } from 'react';
import { idle, type PowerSyncClient, type SyncStatus } from './client.js';

/**
 * Observe a PowerSync client's connection without starting or owning its sync.
 * Use TanStack's useLiveQuery readiness flags to decide whether data is usable.
 */
export function usePowerSyncStatus(client: PowerSyncClient): SyncStatus {
  return useSyncExternalStore(client.subscribeStatus, client.getStatus, getIdleStatus);
}

function getIdleStatus() {
  return idle;
}
