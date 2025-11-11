/**
 * Represents a sync operation collected from the protocol.
 */
export type SyncOperation = {
  /** Type of row (table name) */
  type: string;
  /** Row identifier */
  id: string;
  /** Operation type */
  op: 'PUT' | 'REMOVE';
  /** Operation data (null for REMOVE operations) */
  data: string | null;
};

export type CheckpointEvent = {
  checkpoint: string;
  pendingOperations: ReadonlyArray<SyncOperation>;
};

/**
 * Handler interface for processing sync operations collected from the protocol.
 * This handler is responsible for applying operations to output collections.
 */
export interface SyncOperationsHandler {
  /**
   * Process sync operations collected from the protocol.
   * @param operations Array of operations to process
   */
  handleCheckpoint(event: CheckpointEvent): Promise<void>;
}
