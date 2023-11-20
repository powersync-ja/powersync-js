export class SyncStatus {
  constructor(public connected: boolean, public lastSyncedAt?: Date) {}

  getMessage() {
    return `SyncStatus<connected: ${this.connected} lastSyncedAt: ${this.lastSyncedAt}>`;
  }
}
