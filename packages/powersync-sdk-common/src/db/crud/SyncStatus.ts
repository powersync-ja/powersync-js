import _ from 'lodash';

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

  get connected() {
    return this.options.connected ?? false;
  }

  get lastSyncedAt() {
    return this.options.lastSyncedAt;
  }

  get dataFlowStatus() {
    return (
      this.options.dataFlow ?? {
        downloading: false,
        uploading: false
      }
    );
  }

  isEqual(status: SyncStatus) {
    return _.isEqual(this.options, status.options);
  }

  getMessage() {
    const { dataFlow } = this.options;
    return `SyncStatus<connected: ${this.connected} lastSyncedAt: ${this.lastSyncedAt}. Downloading: ${dataFlow.downloading}. Uploading: ${dataFlow.uploading}`;
  }
}
