import { ref } from 'vue';
import type { ActionRequest } from '@powersync/diagnostics-core';
import { useIntegration } from './diagnostics';

/** The last control action that failed, shown until the next action runs. */
export interface ActionError {
  /** The action as the user sees it, e.g. `Sync now`. */
  label: string;
  message: string;
}

// Module-level so the header toolbar and the Sync Status tab share one in-flight state.
const syncing = ref(false);
const clearing = ref(false);
const actionError = ref<ActionError | null>(null);

/** Shared control actions (checkpoint sync, clear-and-resync, reconnect, disconnect) with in-flight state. */
export function useSyncActions() {
  const integration = useIntegration();

  async function run(label: string, request: ActionRequest): Promise<void> {
    actionError.value = null;
    try {
      await integration.action(request);
    } catch (error) {
      actionError.value = { label, message: error instanceof Error ? error.message : String(error) };
    }
  }

  async function syncNow() {
    syncing.value = true;
    try {
      await run('Sync now', { action: 'requestCheckpoint' });
    } finally {
      syncing.value = false;
    }
  }

  async function clearAndResync() {
    clearing.value = true;
    try {
      await run('Clear & re-sync', { action: 'clearData' });
    } finally {
      clearing.value = false;
    }
  }

  return {
    syncing,
    clearing,
    actionError,
    syncNow,
    clearAndResync,
    reconnect: () => run('Reconnect', { action: 'reconnect' }),
    disconnect: () => run('Disconnect', { action: 'disconnect' })
  };
}
