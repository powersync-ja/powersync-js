export type SyncDataFlowStatus = Partial<{
  downloading: boolean;
  uploading: boolean;
}>;

export interface SyncPriorityStatus {
  priority: number;
  lastSyncedAt?: Date;
  hasSynced?: boolean;
}

export type SyncStatusOptions = {
  connected?: boolean;
  connecting?: boolean;
  dataFlow?: SyncDataFlowStatus;
  lastSyncedAt?: Date;
  hasSynced?: boolean;
  priorityStatusEntries?: SyncPriorityStatus[];
};

export class SyncStatus {
  constructor(protected options: SyncStatusOptions) {}

  /**
   * true if currently connected.
   */
  get connected() {
    return this.options.connected ?? false;
  }

  get connecting() {
    return this.options.connecting ?? false;
  }

  /**
   *  Time that a last sync has fully completed, if any.
   *  Currently this is reset to null after a restart.
   */
  get lastSyncedAt() {
    return this.options.lastSyncedAt;
  }

  /**
   * Indicates whether there has been at least one full sync, if any.
   * Is undefined when unknown, for example when state is still being loaded from the database.
   */
  get hasSynced() {
    return this.options.hasSynced;
  }

  /**
   *  Upload/download status
   */
  get dataFlowStatus() {
    return (
      this.options.dataFlow ?? {
        /**
         * true if actively downloading changes.
         * This is only true when {@link connected} is also true.
         */
        downloading: false,
        /**
         * true if uploading changes.
         */
        uploading: false
      }
    );
  }

  /**
   * Partial sync status for involved bucket priorities.
   */
  get priorityStatusEntries() {
    return (this.options.priorityStatusEntries ?? []).slice().sort(SyncStatus.comparePriorities);
  }

  /**
   * Reports a pair of {@link SyncStatus#hasSynced} and {@link SyncStatus#lastSyncedAt} fields that apply
   * to a specific bucket priority instead of the entire sync operation.
   *
   * When buckets with different priorities are declared, PowerSync may choose to synchronize higher-priority
   * buckets first. When a consistent view over all buckets for all priorities up until the given priority is
   * reached, PowerSync makes data from those buckets available before lower-priority buckets have finished
   * synchronizing.
   * When PowerSync makes data for a given priority available, all buckets in higher-priorities are guaranteed to
   * be consistent with that checkpoint. For this reason, this method may also return the status for lower priorities.
   * In a state where the PowerSync just finished synchronizing buckets in priority level 3, calling this method
   * with a priority of 1 may return information for priority level 3.
   *
   * @param priority The bucket priority for which the status should be reported.
   */
  statusForPriority(priority: number): SyncPriorityStatus {
    // priorityStatusEntries are sorted by ascending priorities (so higher numbers to lower numbers).
    for (const known of this.priorityStatusEntries) {
      // We look for the first entry that doesn't have a higher priority.
      if (known.priority >= priority) {
        return known;
      }
    }

    // If we have a complete sync, that necessarily includes all priorities.
    return {
      priority,
      lastSyncedAt: this.lastSyncedAt,
      hasSynced: this.hasSynced
    };
  }

  isEqual(status: SyncStatus) {
    return JSON.stringify(this.options) == JSON.stringify(status.options);
  }

  getMessage() {
    const dataFlow = this.dataFlowStatus;
    return `SyncStatus<connected: ${this.connected} connecting: ${this.connecting} lastSyncedAt: ${this.lastSyncedAt} hasSynced: ${this.hasSynced}. Downloading: ${dataFlow.downloading}. Uploading: ${dataFlow.uploading}`;
  }

  toJSON(): SyncStatusOptions {
    return {
      connected: this.connected,
      connecting: this.connecting,
      dataFlow: this.dataFlowStatus,
      lastSyncedAt: this.lastSyncedAt,
      hasSynced: this.hasSynced,
      priorityStatusEntries: this.priorityStatusEntries
    };
  }

  private static comparePriorities(a: SyncPriorityStatus, b: SyncPriorityStatus) {
    return b.priority - a.priority; // Reverse because higher priorities have lower numbers
  }
}
