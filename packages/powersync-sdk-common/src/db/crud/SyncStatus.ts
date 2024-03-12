export type SyncDataFlowStatus = Partial<{
  downloading: boolean;
  uploading: boolean;
}>;

export type SyncStatusOptions = {
  connected?: boolean;
  dataFlow?: SyncDataFlowStatus;
  lastSyncedAt?: Date;
};

export class SyncStatus {
  constructor(protected options: SyncStatusOptions) {}

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
    return JSON.stringify(this.options) == JSON.stringify(status.options);
  }

  getMessage() {
    const dataFlow = this.dataFlowStatus;
    return `SyncStatus<connected: ${this.connected} lastSyncedAt: ${this.lastSyncedAt}. Downloading: ${dataFlow.downloading}. Uploading: ${dataFlow.uploading}`;
  }

  toJSON(): SyncStatusOptions {
    return {
      connected: this.connected,
      dataFlow: this.dataFlowStatus,
      lastSyncedAt: this.lastSyncedAt
    };
  }
}
