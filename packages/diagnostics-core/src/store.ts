import { atom, type ReadableAtom, type WritableAtom } from 'nanostores';
import { hasSources, type DiagnosticsSource, type SdkIntegration } from './integration.js';
import type { BucketState, LogRecord, StreamState, SyncState, Unsubscribe, UploadQueueState } from './shapes.js';

const MAX_LOGS = 2000;

/**
 * Reactive stores derived from an {@link SdkIntegration}'s pushed events.
 *
 * The UI reads these atoms; they update from `observeEvents`. This is the UI's copy of the push
 * bridge — state is rebuilt here from the event stream rather than assumed to cross the boundary.
 */
export interface DiagnosticsStores {
  /**
   * True while there is a database to show: after the first event arrives, or, on a host that fronts
   * several databases, while one is attached.
   */
  readonly connected: ReadableAtom<boolean>;
  readonly status: ReadableAtom<SyncState | null>;
  readonly streams: ReadableAtom<StreamState[]>;
  readonly buckets: ReadableAtom<BucketState[]>;
  readonly uploadQueue: ReadableAtom<UploadQueueState | null>;
  readonly logs: ReadableAtom<LogRecord[]>;
  /** The attached databases on a multi-source host; `null` on a host with one fixed database. */
  readonly sources: ReadableAtom<DiagnosticsSource[] | null>;
  /** The database the stores reflect, on a multi-source host. */
  readonly activeSource: ReadableAtom<DiagnosticsSource | null>;
  /** Switches the stores to another attached database (multi-source hosts only). */
  selectSource(sourceId: string): Promise<void>;
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
  const sources = atom<DiagnosticsSource[] | null>(null);
  const activeSource = atom<DiagnosticsSource | null>(null);

  // The subscription settles asynchronously; the stores exist at once so the UI can bind to them.
  const subscription = integration.observeEvents((event) => {
    // On a multi-source host, events only count while a database is attached.
    if (sources.get() !== null && !activeSource.get()) return;
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

  // Multi-source hosts: follow the selected database, or the first attached one, and start over when
  // it changes or goes away. The integration replays the new database's snapshots after selection.
  let selectedId: string | null = null;
  const applySources = async (list: DiagnosticsSource[]) => {
    sources.set(list);
    const wanted = selectedId ? list.find((source) => source.id === selectedId) : undefined;
    const next = wanted ?? list[0] ?? null;
    if (next?.id === activeSource.get()?.id) return;
    activeSource.set(next);
    status.set(null);
    streams.set([]);
    buckets.set([]);
    uploadQueue.set(null);
    connected.set(next !== null);
    if (hasSources(integration)) await integration.selectSource(next?.id ?? null);
  };
  const sourcesSubscription: Promise<Unsubscribe> | null = hasSources(integration)
    ? integration.observeSources((list) => void applySources(list))
    : null;

  return {
    connected,
    status,
    streams,
    buckets,
    uploadQueue,
    logs,
    sources,
    activeSource,
    selectSource: async (sourceId) => {
      selectedId = sourceId;
      await applySources(sources.get() ?? []);
    },
    clearLogs: () => logs.set([]),
    dispose: () => {
      void subscription.then((unsubscribe) => unsubscribe());
      void sourcesSubscription?.then((unsubscribe) => unsubscribe());
    }
  };
}
