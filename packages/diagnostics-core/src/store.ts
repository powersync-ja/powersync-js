import { atom, type ReadableAtom, type WritableAtom } from 'nanostores';
import type { SdkIntegration } from './integration.js';
import type { BucketState, LogRecord, StreamState, SyncState, UploadQueueState } from './shapes.js';

const MAX_LOGS = 2000;

/**
 * Reactive stores derived from an {@link SdkIntegration}'s pushed events.
 *
 * The UI reads these atoms; they update from `observeEvents`. This is the UI's copy of the push
 * bridge — state is rebuilt here from the event stream rather than assumed to cross the boundary.
 */
export interface DiagnosticsStores {
  /** True once the first event arrives from the integration. */
  readonly connected: ReadableAtom<boolean>;
  readonly status: ReadableAtom<SyncState | null>;
  readonly streams: ReadableAtom<StreamState[]>;
  readonly buckets: ReadableAtom<BucketState[]>;
  readonly uploadQueue: ReadableAtom<UploadQueueState | null>;
  readonly logs: ReadableAtom<LogRecord[]>;
  clearLogs(): void;
  /** Stops listening to the integration. */
  dispose(): void;
}

export function createDiagnosticsStores(integration: SdkIntegration): DiagnosticsStores {
  const connected = atom(false);
  const status = atom<SyncState | null>(null);
  const streams = atom<StreamState[]>([]);
  const buckets = atom<BucketState[]>([]);
  const uploadQueue = atom<UploadQueueState | null>(null);
  const logs: WritableAtom<LogRecord[]> = atom<LogRecord[]>([]);

  const unsubscribe = integration.observeEvents((event) => {
    connected.set(true);
    switch (event.type) {
      case 'status':
        status.set(event.payload);
        break;
      case 'streams':
        streams.set(event.payload);
        break;
      case 'buckets':
        buckets.set(event.payload);
        break;
      case 'uploadQueue':
        uploadQueue.set(event.payload);
        break;
      case 'logs':
        logs.set([...logs.get(), ...event.payload].slice(-MAX_LOGS));
        break;
      default:
        break;
    }
  });

  return {
    connected,
    status,
    streams,
    buckets,
    uploadQueue,
    logs,
    clearLogs: () => logs.set([]),
    dispose: unsubscribe
  };
}
