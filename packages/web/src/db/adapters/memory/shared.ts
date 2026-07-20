import { RawQueryResult } from '@powersync/common';

export interface WriteAheadBuffers {
  database: SharedArrayBuffer;
  writeAheadLog: SharedArrayBuffer;
}

export interface WriteAheadState {
  /**
   * Length of the main database file.
   */
  fileSize: number;
  walEnd: number;
  /**
   * A map of database position offsets to offsets in the WAL logs at which position contents of the page are stored.
   */
  overlay: Map<number, WalOverlayEntry>;
}

export interface WalOverlayEntry {
  logOffset: number;
  size: number;
}

export interface WalIndexChange {
  fileSize: number;
  walEnd: number;

  /**
   * New overlay entries to add, encoded as (key, value) pairs of {@link WriteAheadState.overlay}.
   */
  added: (number | WalOverlayEntry)[];

  /**
   * Whether to clear the overlay (meaning that we ran a checkpoint).
   */
  cleared: boolean;
}

export interface DatabaseServer {
  /**
   * Open a database connection from the given database and write-ahead log buffers.
   */
  open(buffers: WriteAheadBuffers): Promise<void>;

  /**
   * Push new wal changes to this worker.
   */
  updateWalState(overlay: WalIndexChange): Promise<void>;

  executeRaw(query: string, params?: any[] | undefined): Promise<RawQueryResult>;

  /**
   * Takes WAL changes made by this worker during its active write iteration.
   */
  takeWalChanges(): Promise<WalIndexChange>;
}

export function emptyWalState(): WriteAheadState {
  return { fileSize: 0, walEnd: 0, overlay: new Map() };
}

export function applyWalChanges(state: WriteAheadState, changes: WalIndexChange) {
  state.fileSize = changes.fileSize;
  state.walEnd = changes.walEnd;

  if (changes.cleared) {
    state.overlay.clear();
  }

  for (let i = 0; i < changes.added.length; i += 2) {
    const dbOffset = changes.added[i] as number;
    const walOffset = changes.added[i + 1] as WalOverlayEntry;
    state.overlay.set(dbOffset, walOffset);
  }
}
