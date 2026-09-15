import { ref } from 'vue';
import { useIntegration } from './diagnostics';

// Module-level so the header toolbar and the Sync Status tab share one in-flight state.
const syncing = ref(false);
const clearing = ref(false);
const syncError = ref<string | null>(null);

/** Shared write actions (checkpoint sync / clear-and-resync / reconnect) with in-flight state. */
export function useSyncActions() {
  const integration = useIntegration();

  async function syncNow() {
    syncing.value = true;
    syncError.value = null;
    try {
      await integration.action({ action: 'requestCheckpoint' });
    } catch (e) {
      syncError.value = e instanceof Error ? e.message : String(e);
    } finally {
      syncing.value = false;
    }
  }

  async function clearAndResync() {
    clearing.value = true;
    syncError.value = null;
    try {
      await integration.action({ action: 'clearData' });
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
    reconnect: () => {
      syncError.value = null;
      return integration.action({ action: 'reconnect' });
    },
    disconnect: () => integration.action({ action: 'disconnect' })
  };
}
