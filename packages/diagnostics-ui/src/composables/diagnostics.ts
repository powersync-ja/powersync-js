import { inject, provide, type InjectionKey } from 'vue';
import { useStore } from '@nanostores/vue';
import type { DiagnosticsClient } from '@powersync/diagnostics-core';

const CLIENT_KEY: InjectionKey<DiagnosticsClient> = Symbol('powersync-diagnostics-client');

/** Provide a {@link DiagnosticsClient} to the diagnostics UI tree. Call once in the host. */
export function provideDiagnostics(client: DiagnosticsClient): void {
  provide(CLIENT_KEY, client);
}

export function useDiagnosticsClient(): DiagnosticsClient {
  const client = inject(CLIENT_KEY);
  if (!client) {
    throw new Error('[diagnostics-ui] No DiagnosticsClient provided. Call provideDiagnostics(client) in the host.');
  }
  return client;
}

/** The client plus its push channels adapted to Vue refs. */
export function useDiagnostics() {
  const client = useDiagnosticsClient();
  return {
    client,
    connected: useStore(client.connected),
    status: useStore(client.status),
    streams: useStore(client.streams),
    buckets: useStore(client.buckets),
    uploadQueue: useStore(client.uploadQueue),
    logs: useStore(client.logs)
  };
}
