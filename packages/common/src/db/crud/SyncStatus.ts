export type SyncDataFlowStatus = Partial<{
  downloading: boolean;
  uploading: boolean;
}>;

export type SyncStatusOptions = {
  connected?: boolean;
  dataFlow?: SyncDataFlowStatus;
  lastSyncedAt?: Date;
  hasSynced?: boolean;
};

export class SyncStatus {
  constructor(protected options: SyncStatusOptions) { }

  /**
   * true if currently connected.
   */
  get connected() {
    return this.options.connected ?? false;
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

  isEqual(status: SyncStatus) {
    if (!status) return false;

    const thisOpts = this.options;
    const otherOpts = status.options;

    return (
      thisOpts.connected === otherOpts.connected &&
      thisOpts.hasSynced === otherOpts.hasSynced &&
      (thisOpts.lastSyncedAt?.getTime() === otherOpts.lastSyncedAt?.getTime()) &&
      thisOpts.dataFlow?.downloading === otherOpts.dataFlow?.downloading &&
      thisOpts.dataFlow?.uploading === otherOpts.dataFlow?.uploading
    );
  }

  getMessage() {
    const dataFlow = this.dataFlowStatus;
    return `SyncStatus<connected: ${this.connected} lastSyncedAt: ${this.lastSyncedAt} hasSynced: ${this.hasSynced}. Downloading: ${dataFlow.downloading}. Uploading: ${dataFlow.uploading}`;
  }

  toJSON(): SyncStatusOptions {
    return {
      connected: this.connected,
      dataFlow: this.dataFlowStatus,
      lastSyncedAt: this.lastSyncedAt,
      hasSynced: this.hasSynced
    };
  }
}
