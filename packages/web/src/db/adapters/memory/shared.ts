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
  overlay: Map<number, number>;
}

export interface WalIndexChange {
  fileSize: number;
  walEnd: number;

  added: number[];
  cleared: boolean;
}

export interface DatabaseServer {
  open(buffers: WriteAheadBuffers): Promise<void>;
  updateWalState(overlay: WalIndexChange): Promise<void>;

  executeRaw(query: string, params?: any[] | undefined): Promise<RawQueryResult>;
  takeWalChanges(): Promise<WalIndexChange>;
}

export function emptyWalState(): WriteAheadState {
  return { fileSize: 0, walEnd: 0, overlay: new Map() };
}

/**

Main tab:

state:
 - mutex around writer
 - semaphore around readers

to start read:
 - acquire from semaphore.
 - send a wal patch if necessary.
 - ... use!

to start write:
  - acquire from mutex
  - ... use, updating write-ahead log offset
  - update overlay index if offset has changed
  - if len(overlay) > 500
    - acquire all readers
    - checkpoint, incrementing epoch

Reader:

 - obtain overlay from main tab

 */
