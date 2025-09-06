import { CoreStreamSubscription } from '../../client/sync/stream/core-instruction.js';
import { SyncClientImplementation } from '../../client/sync/stream/AbstractStreamingSyncImplementation.js';
import { InternalProgressInformation, ProgressWithOperations, SyncProgress } from './SyncProgress.js';
import { SyncStreamDescription, SyncSubscriptionDescription } from '../../client/sync/sync-streams.js';

export type SyncDataFlowStatus = Partial<{
  downloading: boolean;
  uploading: boolean;
  /**
   * Error during downloading (including connecting).
   *
   * Cleared on the next successful data download.
   */
  downloadError?: Error;
  /**
   * Error during uploading.
   * Cleared on the next successful upload.
   */
  uploadError?: Error;
  /**
   * Internal information about how far we are downloading operations in buckets.
   *
   * Please use the {@link SyncStatus#downloadProgress} property to track sync progress.
   */
  downloadProgress: InternalProgressInformation | null;
  internalStreamSubscriptions: CoreStreamSubscription[] | null;
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
  clientImplementation?: SyncClientImplementation;
};

export class SyncStatus {
  constructor(protected options: SyncStatusOptions) {}

  /**
   * Returns the used sync client implementation (either the one implemented in JavaScript or the newer Rust-based
   * implementation).
   *
   * This information is only available after a connection has been requested.
   */
  get clientImplementation() {
    return this.options.clientImplementation;
  }

  /**
   * Indicates if the client is currently connected to the PowerSync service.
   *
   * @returns {boolean} True if connected, false otherwise. Defaults to false if not specified.
   */
  get connected() {
    return this.options.connected ?? false;
  }

  /**
   * Indicates if the client is in the process of establishing a connection to the PowerSync service.
   *
   * @returns {boolean} True if connecting, false otherwise. Defaults to false if not specified.
   */
  get connecting() {
    return this.options.connecting ?? false;
  }

  /**
   * Time that a last sync has fully completed, if any.
   * This timestamp is reset to null after a restart of the PowerSync service.
   *
   * @returns {Date | undefined} The timestamp of the last successful sync, or undefined if no sync has completed.
   */
  get lastSyncedAt() {
    return this.options.lastSyncedAt;
  }

  /**
   * Indicates whether there has been at least one full sync completed since initialization.
   *
   * @returns {boolean | undefined} True if at least one sync has completed, false if no sync has completed,
   * or undefined when the state is still being loaded from the database.
   */
  get hasSynced() {
    return this.options.hasSynced;
  }

  /**
   * Provides the current data flow status regarding uploads and downloads.
   *
   * @returns {SyncDataFlowStatus} An object containing:
   * - downloading: True if actively downloading changes (only when connected is also true)
   * - uploading: True if actively uploading changes
   * Defaults to {downloading: false, uploading: false} if not specified.
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
   * All sync streams currently being tracked in teh database.
   *
   * This returns null when the database is currently being opened and we don't have reliable information about all
   * included streams yet.
   */
  get syncStreams(): SyncStreamStatus[] | undefined {
    return this.options.dataFlow?.internalStreamSubscriptions?.map((core) => new SyncStreamStatusView(this, core));
  }

  /**
   * If the `stream` appears in {@link syncStreams}, returns the current status for that stream.
   */
  forStream(stream: SyncStreamDescription): SyncStreamStatus | undefined {
    const asJson = JSON.stringify(stream.parameters);
    const raw = this.options.dataFlow?.internalStreamSubscriptions?.find(
      (r) => r.name == stream.name && asJson == JSON.stringify(r.parameters)
    );

    return raw && new SyncStreamStatusView(this, raw);
  }

  /**
   * Provides sync status information for all bucket priorities, sorted by priority (highest first).
   *
   * @returns {SyncPriorityStatus[]} An array of status entries for different sync priority levels,
   * sorted with highest priorities (lower numbers) first.
   */
  get priorityStatusEntries() {
    return (this.options.priorityStatusEntries ?? []).slice().sort(SyncStatus.comparePriorities);
  }

  /**
   * A realtime progress report on how many operations have been downloaded and
   * how many are necessary in total to complete the next sync iteration.
   *
   * This field is only set when {@link SyncDataFlowStatus#downloading} is also true.
   */
  get downloadProgress(): SyncProgress | null {
    const internalProgress = this.options.dataFlow?.downloadProgress;
    if (internalProgress == null) {
      return null;
    }

    return new SyncProgress(internalProgress);
  }

  /**
   * Reports the sync status (a pair of {@link SyncStatus#hasSynced} and {@link SyncStatus#lastSyncedAt} fields)
   * for a specific bucket priority level.
   *
   * When buckets with different priorities are declared, PowerSync may choose to synchronize higher-priority
   * buckets first. When a consistent view over all buckets for all priorities up until the given priority is
   * reached, PowerSync makes data from those buckets available before lower-priority buckets have finished
   * syncing.
   *
   * This method returns the status for the requested priority or the next higher priority level that has
   * status information available. This is because when PowerSync makes data for a given priority available,
   * all buckets in higher-priorities are guaranteed to be consistent with that checkpoint.
   *
   * For example, if PowerSync just finished synchronizing buckets in priority level 3, calling this method
   * with a priority of 1 may return information for priority level 3.
   *
   * @param {number} priority The bucket priority for which the status should be reported
   * @returns {SyncPriorityStatus} Status information for the requested priority level or the next higher level with available status
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

  /**
   * Compares this SyncStatus instance with another to determine if they are equal.
   * Equality is determined by comparing the serialized JSON representation of both instances.
   *
   * @param {SyncStatus} status The SyncStatus instance to compare against
   * @returns {boolean} True if the instances are considered equal, false otherwise
   */
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

    return JSON.stringify(this.options, replacer) == JSON.stringify(status.options, replacer);
  }

  /**
   * Creates a human-readable string representation of the current sync status.
   * Includes information about connection state, sync completion, and data flow.
   *
   * @returns {string} A string representation of the sync status
   */
  getMessage() {
    const dataFlow = this.dataFlowStatus;
    return `SyncStatus<connected: ${this.connected} connecting: ${this.connecting} lastSyncedAt: ${this.lastSyncedAt} hasSynced: ${this.hasSynced}. Downloading: ${dataFlow.downloading}. Uploading: ${dataFlow.uploading}. UploadError: ${dataFlow.uploadError}, DownloadError?: ${dataFlow.downloadError}>`;
  }

  /**
   * Serializes the SyncStatus instance to a plain object.
   *
   * @returns {SyncStatusOptions} A plain object representation of the sync status
   */
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

/**
 * Information about a sync stream subscription.
 */
export interface SyncStreamStatus {
  progress: ProgressWithOperations | null;
  subscription: SyncSubscriptionDescription;
  priority: number | null;
}

class SyncStreamStatusView implements SyncStreamStatus {
  subscription: SyncSubscriptionDescription;

  constructor(
    private status: SyncStatus,
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
    if (this.status.dataFlowStatus.downloadProgress == null) {
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
