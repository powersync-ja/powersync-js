import { ref } from 'vue';
import { useDiagnosticsClient } from './diagnostics';

// Module-level so the header toolbar and the Sync Status tab share one in-flight state.
const syncing = ref(false);
const clearing = ref(false);
const syncError = ref<string | null>(null);

/** Shared write actions (checkpoint sync / clear-and-resync / reconnect) with in-flight state. */
export function useSyncActions() {
  const client = useDiagnosticsClient();

  async function syncNow() {
    syncing.value = true;
    syncError.value = null;
    try {
      await client.requestCheckpoint();
    } catch (e) {
      syncError.value = e instanceof Error ? e.message : String(e);
    } finally {
      syncing.value = false;
    }
  }

  async function clearAndResync() {
    clearing.value = true;
    try {
      await client.clearData();
    } catch {
      // surfaced via status/error channels
    } finally {
      clearing.value = false;
    }
  }

  return {
    syncing,
    clearing,
    syncError,
    syncNow,
    clearAndResync,
    reconnect: () => client.reconnect(),
    disconnect: () => client.disconnect()
  };
}
