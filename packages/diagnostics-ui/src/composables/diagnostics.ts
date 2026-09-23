import { inject, provide, onScopeDispose, shallowRef, type InjectionKey, type ShallowRef } from 'vue';
import { atom } from 'nanostores';
import { useStore } from '@nanostores/vue';
import type { SdkIntegration } from '@powersync/diagnostics-core';
import { createDiagnosticsStores, type DiagnosticsStores } from './stores';

interface DiagnosticsContext {
  /** Set once the integration is available. Null while a promised integration is still pending. */
  integration: ShallowRef<SdkIntegration | null>;
  stores: ShallowRef<DiagnosticsStores | null>;
}

const KEY: InjectionKey<DiagnosticsContext> = Symbol('powersync-diagnostics');

/**
 * Provide an {@link SdkIntegration} to the diagnostics UI tree. Call once in the host, during setup.
 *
 * Accepts a promise so a host that receives its integration asynchronously (for example an iframe
 * waiting for a `MessagePort`) can still provide synchronously — Vue's `provide` only works during
 * component setup. The UI derives its reactive state from the integration's pushed events.
 */
export function provideDiagnostics(source: SdkIntegration | Promise<SdkIntegration>): void {
  const integration = shallowRef<SdkIntegration | null>(null);
  const stores = shallowRef<DiagnosticsStores | null>(null);
  let disposed = false;

  const attach = (value: SdkIntegration) => {
    if (disposed) return;
    integration.value = value;
    stores.value = createDiagnosticsStores(value);
  };
  if (source instanceof Promise) {
    void source.then(attach);
  } else {
    attach(source);
  }

  provide(KEY, { integration, stores });
  onScopeDispose(() => {
    disposed = true;
    stores.value?.dispose();
  });
}

function useContext(): DiagnosticsContext {
  const context = inject(KEY);
  if (!context) {
    throw new Error('[diagnostics-ui] No SdkIntegration provided. Call provideDiagnostics(integration) in the host.');
  }
  return context;
}

/** The integration the UI talks to. Throws if called before the integration has arrived. */
export function useIntegration(): SdkIntegration {
  const { integration } = useContext();
  if (!integration.value) {
    throw new Error('[diagnostics-ui] The SdkIntegration is not available yet.');
  }
  return integration.value;
}

// Placeholder atoms let the UI render its "connecting" state before the integration arrives.
const EMPTY = {
  connected: atom(false),
  status: atom(null),
  streams: atom([]),
  buckets: atom([]),
  uploadQueue: atom(null),
  logs: atom([]),
  sources: atom(null),
  activeSource: atom(null)
};

/** The integration plus its pushed state adapted to Vue refs. */
export function useDiagnostics() {
  const { integration, stores } = useContext();
  const activeStores = stores.value ?? EMPTY;
  return {
    /** The live integration; the panel only renders data views once it is present. */
    client: integration.value as SdkIntegration,
    connected: useStore(activeStores.connected),
    status: useStore(activeStores.status),
    streams: useStore(activeStores.streams),
    buckets: useStore(activeStores.buckets),
    uploadQueue: useStore(activeStores.uploadQueue),
    logs: useStore(activeStores.logs),
    /** Attached databases on a host that fronts several; `null` on a host with one fixed database. */
    sources: useStore(activeStores.sources),
    /** The database shown, on such a host. */
    activeSource: useStore(activeStores.activeSource),
    selectSource: (sourceId: string) => stores.value?.selectSource(sourceId),
    clearLogs: () => stores.value?.clearLogs()
  };
}
