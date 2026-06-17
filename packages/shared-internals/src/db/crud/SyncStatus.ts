import {
  SyncDataFlowStatus,
  SyncPriorityStatus,
  SyncProgress,
  SyncStatus,
  SyncStreamDescription,
  SyncStreamStatus,
  SyncSubscriptionDescription
} from '@powersync/common';
import { CoreStreamSubscription, CoreSyncStatus } from '../../client/sync/stream/core-instruction.js';
import { SyncPriorityStatus as CoreSyncPriorityStatus } from '../../client/sync/stream/core-instruction.js';
import { SyncProgressImpl } from './SyncProgress.js';
import { FULL_SYNC_PRIORITY } from '../../constants.js';

export class SyncStatusSnapshot implements SyncStatus {
  readonly dataFlowStatus: SyncDataFlowStatus;

  constructor(
    readonly core: CoreSyncStatus | null,
    dataFlow: SyncDataFlowStatus
  ) {
    this.dataFlowStatus = {
      uploading: false,
      ...dataFlow
    };
  }

  get connected(): boolean {
    return this.core?.connected ?? false;
  }

  get connecting(): boolean {
    return this.core?.connecting ?? false;
  }

  get downloading(): boolean {
    return this.core?.downloading != null;
  }

  get lastSyncedAt(): Date | undefined {
    return this.statusForPriority(FULL_SYNC_PRIORITY)?.lastSyncedAt;
  }

  get hasSynced(): boolean | undefined {
    return this.statusForPriority(FULL_SYNC_PRIORITY)?.hasSynced;
  }

  get syncStreams(): SyncStreamStatus[] | undefined {
    return this.core?.streams.map((core) => new SyncStreamStatusView(this, core));
  }

  forStream(stream: SyncStreamDescription): SyncStreamStatus | undefined {
    const asJson = JSON.stringify(stream.parameters);
    const raw = this.core?.streams?.find((r) => r.name == stream.name && asJson == JSON.stringify(r.parameters));

    return raw && new SyncStreamStatusView(this, raw);
  }

  get priorityStatusEntries(): SyncPriorityStatus[] | undefined {
    return this.core?.priority_status.map(priorityToJs);
  }

  get downloadProgress(): SyncProgress | null {
    const internalProgress = this.core?.downloading;
    if (internalProgress == null) {
      return null;
    }

    return new SyncProgressImpl(internalProgress);
  }

  statusForPriority(priority: number): SyncPriorityStatus | undefined {
    const coreStatus = this.core?.priority_status;
    if (coreStatus == null) return undefined;

    // priorityStatusEntries are sorted by ascending priorities (so higher numbers to lower numbers).
    for (const known of coreStatus) {
      // We look for the first entry that doesn't have a higher priority.
      if (known.priority >= priority) {
        return priorityToJs(known);
      }
    }

    // If we get to this point, no priority entry exists so we never synced a priority that low.
    return {
      priority,
      lastSyncedAt: undefined,
      hasSynced: false
    };
  }

  isEqual(status: SyncStatus) {
    /**
     * By default Error object are serialized to an empty object.
     * This replaces Errors with more useful information before serialization.
     */
    const replacer = (_: string, value: any) => {
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }
      return value;
    };

    const options = { core: this.core, dataFlow: this.dataFlowStatus };
    const otherStatus = status as unknown as SyncStatusSnapshot;
    const otherOptions = {
      core: otherStatus.core,
      dataFlow: otherStatus.dataFlowStatus
    };

    return JSON.stringify(options, replacer) == JSON.stringify(otherOptions, replacer);
  }

  getMessage() {
    const dataFlow = this.dataFlowStatus;
    return `SyncStatus<connected: ${this.connected} connecting: ${this.connecting} lastSyncedAt: ${this.lastSyncedAt} hasSynced: ${this.hasSynced}. Downloading: ${this.downloading}. Uploading: ${dataFlow.uploading}. UploadError: ${dataFlow.uploadError}, DownloadError?: ${dataFlow.downloadError}>`;
  }

  /**
   * Serializes the SyncStatus instance to a plain object.
   *
   * @returns A plain object representation of the sync status
   */
  toJSON(): SyncStatusJson {
    return {
      core: this.core,
      dataFlow: {
        ...this.dataFlowStatus,
        uploadError: this.serializeError(this.dataFlowStatus.uploadError),
        downloadError: this.serializeError(this.dataFlowStatus.downloadError)
      }
    };
  }

  /**
   * Not all errors are serializable over a MessagePort. E.g. some `DomExceptions` fail to be passed across workers.
   * This explicitly serializes errors in the SyncStatus.
   */
  protected serializeError(error?: Error) {
    if (typeof error == 'undefined') {
      return undefined;
    }
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
}

function coreTimestampToDate(time: number | null): Date | undefined {
  return time == null ? undefined : new Date(time * 1000);
}

function priorityToJs(status: CoreSyncPriorityStatus): SyncPriorityStatus {
  return {
    priority: status.priority,
    hasSynced: status.has_synced ?? undefined,
    lastSyncedAt: coreTimestampToDate(status.last_synced_at)
  };
}

export interface SyncStatusJson {
  core: CoreSyncStatus | null;
  dataFlow: SyncDataFlowStatus;
}

class SyncStreamStatusView implements SyncStreamStatus {
  subscription: SyncSubscriptionDescription;

  constructor(
    private status: SyncStatusSnapshot,
    private core: CoreStreamSubscription
  ) {
    this.subscription = {
      name: core.name,
      parameters: core.parameters,
      active: core.active,
      isDefault: core.is_default,
      hasExplicitSubscription: core.has_explicit_subscription,
      expiresAt: core.expires_at != null ? new Date(core.expires_at * 1000) : null,
      hasSynced: core.last_synced_at != null,
      lastSyncedAt: core.last_synced_at != null ? new Date(core.last_synced_at * 1000) : null
    };
  }

  get progress() {
    if (this.status.core?.downloading == null) {
      // Don't make download progress public if we're not currently downloading.
      return null;
    }

    const { total, downloaded } = this.core.progress;
    const progress = total == 0 ? 0.0 : downloaded / total;

    return { totalOperations: total, downloadedOperations: downloaded, downloadedFraction: progress };
  }

  get priority() {
    return this.core.priority;
  }
}
