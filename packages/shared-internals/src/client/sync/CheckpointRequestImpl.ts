import { CheckpointRequest } from '@powersync/common';
import { BasePowerSyncDatabase } from '../BasePowerSyncDatabase.js';
import {
  cannotRequestDueToDisconnectedError,
  checkpointRequestsNotEnabledError,
  isCheckpointRequestApplied
} from './stream/CheckpointState.js';
import { SyncStatusSnapshot } from '../../db/crud/SyncStatus.js';

export class CheckpointRequestImpl implements CheckpointRequest {
  constructor(
    private readonly requestId: bigint,
    private readonly database: BasePowerSyncDatabase
  ) {}

  get hasSyned(): boolean {
    const status = this.database.currentStatus.core;
    return isCheckpointRequestApplied(status, this.requestId);
  }

  async waitForSync(options?: { signal?: AbortSignal }): Promise<void> {
    if (this.hasSyned) return;

    const manager = this.database.connectionManager;
    if (manager.syncStreamImplementation == null) {
      throw cannotRequestDueToDisconnectedError();
    }
    if (manager.connectionOptions?.checkpointMode == 'legacy') {
      throw checkpointRequestsNotEnabledError();
    }

    await this.database.waitForStatus((status) => {
      if (isCheckpointRequestApplied((status as SyncStatusSnapshot).core, this.requestId)) {
        return true;
      }

      const anyError = status.downloadError ?? status.uploadError;
      if (anyError) {
        throw new Error('Sync error while waiting for checkpoint request', { cause: anyError });
      }

      if (!status.connected && !status.connecting) {
        throw cannotRequestDueToDisconnectedError();
      }

      return false;
    }, options?.signal);
  }
}
